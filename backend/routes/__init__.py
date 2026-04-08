"""
Routes package — all API routers collected for main.py to include.
"""

from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.discharge import router as discharge_router
from routes.whatsapp import router as whatsapp_router
from routes.prescriptions import router as prescriptions_router
from routes.analytics import router as analytics_router
from routes.doctor import router as doctor_router
from routes.patient import router as patient_router
from routes.reports import router as reports_router

all_routers = [
    health_router,
    auth_router,
    discharge_router,
    whatsapp_router,
    prescriptions_router,
    analytics_router,
    reports_router,
    doctor_router,
    patient_router,
]

__all__ = ["all_routers"]
