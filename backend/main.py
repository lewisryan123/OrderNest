import os
from datetime import datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel
from sqlalchemy import create_engine, text
from dotenv import load_dotenv


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise Exception("DATABASE_URL is missing from .env")


# ==========================================
# DATABASE
# ==========================================

engine = create_engine(DATABASE_URL)


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(title="OrderNest API")


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# JWT CONFIGURATION
# ==========================================
import os

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24


# ==========================================
# AUTHENTICATION
# ==========================================

security = HTTPBearer()


def create_access_token(user_id: int):

    expire = datetime.utcnow() + timedelta(
        minutes=TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return int(user_id)

    except (JWTError, ValueError):

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


# ==========================================
# MODELS
# ==========================================

class SignupRequest(BaseModel):

    username: str
    password: str


class LoginRequest(BaseModel):

    username: str
    password: str


class OrderCreate(BaseModel):

    customer: str
    phone: str = ""

    # React sends "order"
    order: str

    customization: str = ""

    delivery_date: str
    delivery_time: str

    total_amount: float
    advance_paid: float = 0

    status: str = "Pending"


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "message": "OrderNest API is running!"
    }


# ==========================================
# DATABASE TEST
# ==========================================

@app.get("/db-test")
def database_test():

    try:

        with engine.connect() as connection:

            result = connection.execute(
                text("SELECT current_database();")
            )

            database_name = result.scalar()

        return {
            "message": "Database connected successfully!",
            "database": database_name
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# SIGN UP
# ==========================================

@app.post("/signup")
def signup(data: SignupRequest):

    username = data.username.strip()

    if len(username) < 3:

        raise HTTPException(
            status_code=400,
            detail="Username must be at least 3 characters"
        )

    if len(data.password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters"
        )

    try:

        with engine.begin() as connection:

            # Check username
            existing_user = connection.execute(
                text("""
                    SELECT id
                    FROM users
                    WHERE LOWER(username) = LOWER(:username)
                """),
                {
                    "username": username
                }
            ).scalar()

            if existing_user:

                raise HTTPException(
                    status_code=400,
                    detail="Username already exists"
                )

            # Hash password
            password_hash = bcrypt.hashpw(
                data.password.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

            # Create user
            result = connection.execute(
                text("""
                    INSERT INTO users (
                        username,
                        password_hash
                    )
                    VALUES (
                        :username,
                        :password_hash
                    )
                    RETURNING id, username
                """),
                {
                    "username": username,
                    "password_hash": password_hash
                }
            )

            user = result.fetchone()

        return {
            "success": True,
            "message": "Account created successfully!",
            "username": user.username
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# LOGIN
# ==========================================

@app.post("/login")
def login(data: LoginRequest):

    try:

        with engine.connect() as connection:

            user = connection.execute(
                text("""
                    SELECT
                        id,
                        username,
                        password_hash
                    FROM users
                    WHERE LOWER(username) = LOWER(:username)
                """),
                {
                    "username": data.username.strip()
                }
            ).fetchone()

        if not user:

            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )

        password_correct = bcrypt.checkpw(
            data.password.encode("utf-8"),
            user.password_hash.encode("utf-8")
        )

        if not password_correct:

            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )

        token = create_access_token(user.id)

        return {
            "success": True,
            "message": "Login successful",
            "token": token,
            "user_id": user.id,
            "username": user.username
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# GET ALL ORDERS FOR CURRENT USER
# ==========================================

@app.get("/orders")
def get_orders(
    current_user: int = Depends(get_current_user)
):

    try:

        with engine.connect() as connection:

            result = connection.execute(
                text("""
                    SELECT
                        id,
                        customer,
                        phone,
                        product,
                        customization,
                        delivery_date,
                        delivery_time,
                        total_amount,
                        advance_paid,
                        payment_status,
                        order_status
                    FROM orders
                    WHERE user_id = :user_id
                    ORDER BY id DESC
                """),
                {
                    "user_id": current_user
                }
            )

            orders = []

            for row in result:

                orders.append({

                    "id": row.id,

                    "customer": row.customer,

                    "phone": row.phone,

                    "order": row.product,

                    "customization": row.customization,

                    "delivery_date": str(
                        row.delivery_date
                    ),

                    "delivery_time": str(
                        row.delivery_time
                    ),

                    "total_amount": float(
                        row.total_amount
                    ),

                    "advance_paid": float(
                        row.advance_paid
                    ),

                    "payment_status": row.payment_status,

                    "status": row.order_status

                })

        return orders

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# CREATE NEW ORDER
# ==========================================

@app.post("/orders")
def create_order(
    order: OrderCreate,
    current_user: int = Depends(get_current_user)
):

    try:

        if order.advance_paid >= order.total_amount:

            payment_status = "Paid"

        elif order.advance_paid > 0:

            payment_status = "Partially Paid"

        else:

            payment_status = "Pending"

        with engine.begin() as connection:

            result = connection.execute(

                text("""
                    INSERT INTO orders (
                        customer,
                        phone,
                        product,
                        customization,
                        delivery_date,
                        delivery_time,
                        total_amount,
                        advance_paid,
                        payment_status,
                        order_status,
                        user_id
                    )

                    VALUES (
                        :customer,
                        :phone,
                        :product,
                        :customization,
                        :delivery_date,
                        :delivery_time,
                        :total_amount,
                        :advance_paid,
                        :payment_status,
                        :order_status,
                        :user_id
                    )

                    RETURNING id
                """),

                {
                    "customer": order.customer,

                    "phone": order.phone,

                    "product": order.order,

                    "customization": order.customization,

                    "delivery_date": order.delivery_date,

                    "delivery_time": order.delivery_time,

                    "total_amount": order.total_amount,

                    "advance_paid": order.advance_paid,

                    "payment_status": payment_status,

                    "order_status": order.status,

                    "user_id": current_user
                }
            )

            order_id = result.scalar()

        return {

            "message": "Order created successfully!",

            "order_id": order_id

        }

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ==========================================
# UPDATE ORDER
# ==========================================

@app.put("/orders/{order_id}")
def update_order(
    order_id: int,
    order: OrderCreate,
    current_user: int = Depends(get_current_user)
):

    try:

        if order.advance_paid >= order.total_amount:

            payment_status = "Paid"

        elif order.advance_paid > 0:

            payment_status = "Partially Paid"

        else:

            payment_status = "Pending"

        with engine.begin() as connection:

            result = connection.execute(

                text("""
                    UPDATE orders

                    SET
                        customer = :customer,
                        phone = :phone,
                        product = :product,
                        customization = :customization,
                        delivery_date = :delivery_date,
                        delivery_time = :delivery_time,
                        total_amount = :total_amount,
                        advance_paid = :advance_paid,
                        payment_status = :payment_status,
                        order_status = :order_status

                    WHERE
                        id = :id
                        AND user_id = :user_id
                """),

                {
                    "id": order_id,

                    "user_id": current_user,

                    "customer": order.customer,

                    "phone": order.phone,

                    "product": order.order,

                    "customization": order.customization,

                    "delivery_date": order.delivery_date,

                    "delivery_time": order.delivery_time,

                    "total_amount": order.total_amount,

                    "advance_paid": order.advance_paid,

                    "payment_status": payment_status,

                    "order_status": order.status
                }
            )

            if result.rowcount == 0:

                raise HTTPException(
                    status_code=404,
                    detail="Order not found"
                )

        return {
            "message": "Order updated successfully"
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# DELETE ORDER
# ==========================================

@app.delete("/orders/{order_id}")
def delete_order(
    order_id: int,
    current_user: int = Depends(get_current_user)
):

    try:

        with engine.begin() as connection:

            result = connection.execute(

                text("""
                    DELETE FROM orders

                    WHERE
                        id = :id
                        AND user_id = :user_id

                    RETURNING id
                """),

                {
                    "id": order_id,
                    "user_id": current_user
                }
            )

            deleted_id = result.scalar()

            if deleted_id is None:

                raise HTTPException(
                    status_code=404,
                    detail="Order not found"
                )

        return {

            "message": "Order deleted successfully!",

            "order_id": deleted_id

        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )


# ==========================================
# DASHBOARD STATISTICS
# ==========================================

@app.get("/stats")
def get_stats(
    current_user: int = Depends(get_current_user)
):

    try:

        with engine.connect() as connection:

            total_orders = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM orders
                    WHERE user_id = :user_id
                """),
                {"user_id": current_user}
            ).scalar()

            pending_orders = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM orders
                    WHERE
                        user_id = :user_id
                        AND order_status != 'Delivered'
                """),
                {"user_id": current_user}
            ).scalar()

            pending_payments = connection.execute(
                text("""
                    SELECT COALESCE(
                        SUM(total_amount - advance_paid), 0
                    )
                    FROM orders
                    WHERE user_id = :user_id
                """),
                {"user_id": current_user}
            ).scalar()

            total_customers = connection.execute(
                text("""
                    SELECT COUNT(DISTINCT customer)
                    FROM orders
                    WHERE user_id = :user_id
                """),
                {"user_id": current_user}
            ).scalar()

            preparing_orders = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM orders
                    WHERE
                        user_id = :user_id
                        AND order_status = 'Preparing'
                """),
                {"user_id": current_user}
            ).scalar()

            ready_orders = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM orders
                    WHERE
                        user_id = :user_id
                        AND order_status = 'Ready'
                """),
                {"user_id": current_user}
            ).scalar()

            delivery_orders = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM orders
                    WHERE
                        user_id = :user_id
                        AND order_status = 'Out for Delivery'
                """),
                {"user_id": current_user}
            ).scalar()

            delivered_orders = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM orders
                    WHERE
                        user_id = :user_id
                        AND order_status = 'Delivered'
                """),
                {"user_id": current_user}
            ).scalar()

        return {

            "total_orders": total_orders,

            "pending_orders": pending_orders,

            "pending_payments": float(
                pending_payments
            ),

            "total_customers": total_customers,

            "preparing_orders": preparing_orders,

            "ready_orders": ready_orders,

            "delivery_orders": delivery_orders,

            "delivered_orders": delivered_orders

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# TODAY'S DELIVERIES
# ==========================================

@app.get("/today-deliveries")
def get_today_deliveries(
    current_user: int = Depends(get_current_user)
):

    try:

        with engine.connect() as connection:

            result = connection.execute(

                text("""
                    SELECT
                        id,
                        customer,
                        product,
                        delivery_date,
                        delivery_time,
                        order_status

                    FROM orders

                    WHERE
                        delivery_date = CURRENT_DATE
                        AND user_id = :user_id

                    ORDER BY delivery_time
                """),

                {
                    "user_id": current_user
                }
            )

            deliveries = []

            for row in result:

                deliveries.append({

                    "id": row.id,

                    "customer": row.customer,

                    "order": row.product,

                    "delivery_date": str(
                        row.delivery_date
                    ),

                    "delivery_time": str(
                        row.delivery_time
                    ),

                    "status": row.order_status

                })

        return deliveries

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )