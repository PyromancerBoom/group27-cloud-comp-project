#!/usr/bin/env python3
"""
Auto-Scaling Monitor — Need A Sidekick (Section 4.3)

Fetches CloudWatch metrics for the EC2 ASG and ALB during / after a load test
and generates a 3-panel time-series chart.

Usage:
    python eval/autoscale_monitor.py \
        --asg-name need-a-sidekick-asg \
        --alb-name "app/need-a-sidekick-alb/0123456789abcdef" \
        --start-time "2026-04-12T10:00:00" \
        --end-time   "2026-04-12T11:00:00"

    # Use relative time shortcuts:
    python eval/autoscale_monitor.py \
        --asg-name need-a-sidekick-asg \
        --alb-name "app/need-a-sidekick-alb/0123456789abcdef" \
        --start-time now-2h

    # Dry-run: list available ASGs and ALBs then exit
    python eval/autoscale_monitor.py --discover

Outputs:
    results/autoscale_chart.png   — 3-panel matplotlib figure
    results/autoscale_metrics.json — raw CloudWatch data
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np

RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", "results"))
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

def parse_time(s: str) -> datetime:
    """Parse ISO8601 or 'now[-Nh|-Nm]' shorthand."""
    s = s.strip()
    now = datetime.now(tz=timezone.utc)
    if s.lower() == "now":
        return now
    if s.lower().startswith("now-"):
        tail = s[4:]
        if tail.endswith("h"):
            return now - timedelta(hours=int(tail[:-1]))
        if tail.endswith("m"):
            return now - timedelta(minutes=int(tail[:-1]))
        raise ValueError(f"Unknown relative time format: {s}")
    # ISO8601 — add UTC if no timezone given
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# CloudWatch helpers
# ---------------------------------------------------------------------------

def get_metric(cw_client, namespace: str, metric_name: str, dimensions: list,
               start: datetime, end: datetime, stat: str = "Average",
               period: int = 60) -> tuple[list, list]:
    """Return (timestamps, values) lists sorted by time."""
    resp = cw_client.get_metric_statistics(
        Namespace=namespace,
        MetricName=metric_name,
        Dimensions=dimensions,
        StartTime=start,
        EndTime=end,
        Period=period,
        Statistics=[stat],
    )
    points = sorted(resp["Datapoints"], key=lambda p: p["Timestamp"])
    timestamps = [p["Timestamp"] for p in points]
    values     = [p[stat] for p in points]
    return timestamps, values


# ---------------------------------------------------------------------------
# Discovery helper
# ---------------------------------------------------------------------------

def discover(region: str):
    """Print available ASG names and ALB names, then exit."""
    session = boto3.session.Session(region_name=region)

    print(f"\n=== Auto Scaling Groups ({region}) ===")
    asg_client = session.client("autoscaling")
    paginator = asg_client.get_paginator("describe_auto_scaling_groups")
    for page in paginator.paginate():
        for asg in page["AutoScalingGroups"]:
            print(f"  {asg['AutoScalingGroupName']}")

    print(f"\n=== Application Load Balancers ({region}) ===")
    elb_client = session.client("elbv2")
    paginator = elb_client.get_paginator("describe_load_balancers")
    for page in paginator.paginate():
        for lb in page["LoadBalancers"]:
            if lb["Type"] == "application":
                # ALB name for CloudWatch is the part after "loadbalancer/"
                arn = lb["LoadBalancerArn"]
                # arn:aws:elasticloadbalancing:REGION:ACCOUNT:loadbalancer/app/NAME/ID
                alb_name = "/".join(arn.split("/")[-3:])  # app/NAME/ID
                print(f"  {lb['LoadBalancerName']}  →  --alb-name \"{alb_name}\"")

    sys.exit(0)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Auto-Scaling CloudWatch Monitor")
    parser.add_argument("--asg-name",   help="Auto Scaling Group name")
    parser.add_argument("--alb-name",   help='ALB dimension value, e.g. "app/name/id"')
    parser.add_argument("--region",     default="ap-southeast-1")
    parser.add_argument("--start-time", default="now-2h",
                        help="ISO8601 or now-Nh / now-Nm (default: now-2h)")
    parser.add_argument("--end-time",   default="now",
                        help="ISO8601 or 'now' (default: now)")
    parser.add_argument("--period",     type=int, default=60,
                        help="CloudWatch period in seconds (default: 60)")
    parser.add_argument("--output-dir", default="results")
    parser.add_argument("--discover",   action="store_true",
                        help="List ASG / ALB names and exit")
    args = parser.parse_args()

    if args.discover:
        discover(args.region)

    if not args.asg_name or not args.alb_name:
        parser.error("--asg-name and --alb-name are required (or use --discover)")

    global RESULTS_DIR
    RESULTS_DIR = Path(args.output_dir)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    start = parse_time(args.start_time)
    end   = parse_time(args.end_time)

    print(f"Fetching CloudWatch metrics from {start.isoformat()} to {end.isoformat()}")
    print(f"  ASG : {args.asg_name}")
    print(f"  ALB : {args.alb_name}")
    print(f"  Region: {args.region}\n")

    session = boto3.session.Session(region_name=args.region)
    cw = session.client("cloudwatch")

    # 1. ASG in-service instance count
    ts_inst, vs_inst = get_metric(
        cw,
        namespace="AWS/AutoScaling",
        metric_name="GroupInServiceInstances",
        dimensions=[{"Name": "AutoScalingGroupName", "Value": args.asg_name}],
        start=start, end=end, stat="Average", period=args.period,
    )

    # 2. ALB requests per target (proxy for request load)
    ts_req, vs_req = get_metric(
        cw,
        namespace="AWS/ApplicationELB",
        metric_name="RequestCountPerTarget",
        dimensions=[{"Name": "LoadBalancer", "Value": args.alb_name}],
        start=start, end=end, stat="Sum", period=args.period,
    )

    # 3. EC2 CPU utilisation per ASG
    ts_cpu, vs_cpu = get_metric(
        cw,
        namespace="AWS/EC2",
        metric_name="CPUUtilization",
        dimensions=[{"Name": "AutoScalingGroupName", "Value": args.asg_name}],
        start=start, end=end, stat="Average", period=args.period,
    )

    if not ts_inst and not ts_req and not ts_cpu:
        print("WARNING: No CloudWatch data returned. Check ASG/ALB names and time range.")
        sys.exit(1)

    # Save raw data
    raw = {
        "asg_name": args.asg_name,
        "alb_name": args.alb_name,
        "start": start.isoformat(),
        "end":   end.isoformat(),
        "period_s": args.period,
        "instance_count": {
            "timestamps": [t.isoformat() for t in ts_inst],
            "values": vs_inst,
        },
        "request_count_per_target": {
            "timestamps": [t.isoformat() for t in ts_req],
            "values": vs_req,
        },
        "cpu_utilization_pct": {
            "timestamps": [t.isoformat() for t in ts_cpu],
            "values": vs_cpu,
        },
    }
    json_path = RESULTS_DIR / "autoscale_metrics.json"
    json_path.write_text(json.dumps(raw, indent=2))
    print(f"Saved raw metrics → {json_path}")

    # ---------------------
    # Plot
    # ---------------------
    fig, axes = plt.subplots(3, 1, figsize=(12, 9), sharex=True)
    fig.suptitle(
        f"Auto-Scaling Behaviour\n{args.asg_name}  |  {start.strftime('%Y-%m-%d %H:%M')} – {end.strftime('%H:%M')} UTC",
        fontsize=12,
    )

    time_fmt = mdates.DateFormatter("%H:%M")

    # Panel 1: Instance count
    ax1 = axes[0]
    if ts_inst:
        ax1.step(ts_inst, vs_inst, where="post", color="steelblue", linewidth=2)
        ax1.fill_between(ts_inst, vs_inst, step="post", alpha=0.15, color="steelblue")
    ax1.set_ylabel("In-Service Instances")
    ax1.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    ax1.grid(True, linestyle="--", alpha=0.4)
    ax1.xaxis.set_major_formatter(time_fmt)

    # Panel 2: Requests per target
    ax2 = axes[1]
    if ts_req:
        ax2.bar(ts_req, vs_req,
                width=timedelta(seconds=args.period * 0.8),
                color="darkorange", alpha=0.75, label="req/target/period")
    ax2.set_ylabel("Requests / Target")
    ax2.grid(True, linestyle="--", alpha=0.4)
    ax2.xaxis.set_major_formatter(time_fmt)

    # Panel 3: CPU utilisation
    ax3 = axes[2]
    if ts_cpu:
        ax3.plot(ts_cpu, vs_cpu, color="firebrick", linewidth=2)
        ax3.fill_between(ts_cpu, vs_cpu, alpha=0.15, color="firebrick")
        ax3.axhline(y=70, color="firebrick", linestyle=":", linewidth=1,
                    label="70% scale-out threshold")
        ax3.legend(fontsize=8)
    ax3.set_ylabel("CPU Utilisation (%)")
    ax3.set_ylim(0, 100)
    ax3.grid(True, linestyle="--", alpha=0.4)
    ax3.xaxis.set_major_formatter(time_fmt)
    ax3.set_xlabel("Time (UTC)")

    fig.autofmt_xdate(rotation=30)
    plt.tight_layout()

    chart_path = RESULTS_DIR / "autoscale_chart.png"
    fig.savefig(chart_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved chart       → {chart_path}")

    # Summary to stdout
    if vs_inst:
        print(f"\nInstance count: min={min(vs_inst):.0f}  max={max(vs_inst):.0f}  "
              f"(delta={max(vs_inst)-min(vs_inst):.0f})")
    if vs_cpu:
        print(f"CPU utilisation: mean={np.mean(vs_cpu):.1f}%  p95={np.percentile(vs_cpu, 95):.1f}%  "
              f"peak={max(vs_cpu):.1f}%")
    if vs_req:
        print(f"Requests/target: total={sum(vs_req):.0f}  peak/period={max(vs_req):.0f}")


if __name__ == "__main__":
    main()
