from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/regions", response_model=list[schemas.RegionOut])
def list_regions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Region).order_by(models.Region.name_uz).all()


@router.get("/districts", response_model=list[schemas.DistrictOut])
def list_districts(region_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return (
        db.query(models.District)
        .filter(models.District.region_id == region_id)
        .order_by(models.District.name_uz)
        .all()
    )
