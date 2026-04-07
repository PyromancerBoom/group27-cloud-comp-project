from fastapi import APIRouter, Depends, Query
from boto3.dynamodb.conditions import Key, Attr
from app.dependencies import get_dynamodb_resource
from app.config import settings

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(
    activity_type: str = Query(default=None),
    hour_prefix: str = Query(default=None, description="e.g. '2026-03-25T'"),
    dynamo=Depends(get_dynamodb_resource),
):
    table = dynamo.Table(settings.dynamodb_table_name)

    filter_parts = []
    expr_values = {}

    if activity_type:
        filter_parts.append("contains(pk, :at)")
        expr_values[":at"] = activity_type

    if hour_prefix:
        filter_parts.append("begins_with(sk, :hp)")
        expr_values[":hp"] = f"HOUR#{hour_prefix}"

    kwargs = {}
    if filter_parts:
        kwargs["FilterExpression"] = " AND ".join(filter_parts)
        kwargs["ExpressionAttributeValues"] = expr_values

    resp = table.scan(**kwargs)
    return {"items": resp.get("Items", []), "count": resp.get("Count", 0)}
