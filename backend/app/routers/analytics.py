from fastapi import APIRouter, Depends, Query
from boto3.dynamodb.conditions import Key
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
    # Simple scan — for production use a GSI or pre-aggregated keys
    kwargs = {}
    if activity_type:
        kwargs["FilterExpression"] = "contains(pk, :at)"
        kwargs["ExpressionAttributeValues"] = {":at": activity_type}
    resp = table.scan(**kwargs)
    return {"items": resp.get("Items", []), "count": resp.get("Count", 0)}
