"""CropKart Database Models and Schema definitions."""

from sqlmodel import SQLModel

from app.models.address import UserAddress
from app.models.buyer_profile import BuyerProfile
from app.models.crop import Crop
from app.models.crop_listing import CropListing
from app.models.delivery_route import DeliveryRoute
from app.models.demand_forecast import DemandForecast
from app.models.farmer_profile import FarmerProfile
from app.models.market_data import MarketData
from app.models.market_price_history import MarketPriceHistory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment
from app.models.transport_request import TransportRequest
from app.models.transporter_location import TransporterLocation
from app.models.transporter_profile import TransporterProfile
from app.models.transporter_vehicle import TransporterVehicle
from app.models.user import User
from app.schemas.auth import NewPassword, Token, TokenPayload
from app.schemas.msg import Message
from app.schemas.user import (
    UpdatePassword,
    UserBase,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)

__all__ = [
    "SQLModel",
    # 17 CropKart Application Tables
    "User",
    "FarmerProfile",
    "BuyerProfile",
    "TransporterProfile",
    "UserAddress",
    "Crop",
    "CropListing",
    "Order",
    "OrderItem",
    "Payment",
    "TransporterVehicle",
    "TransportRequest",
    "TransporterLocation",
    "DeliveryRoute",
    "MarketData",
    "MarketPriceHistory",
    "DemandForecast",
    # Pydantic Schemas / DTOs
    "UserBase",
    "UserCreate",
    "UserRegister",
    "UserUpdate",
    "UserUpdateMe",
    "UserPublic",
    "UsersPublic",
    "UpdatePassword",
    "Token",
    "TokenPayload",
    "NewPassword",
    "Message",
]
