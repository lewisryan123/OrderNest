import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://ordernest-backend-a7yy.onrender.com";

// ==========================================
// AUTH HEADERS
// ==========================================

const getAuthHeaders = () => {
  const token = localStorage.getItem("orderNestToken");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// ==========================================
// MAIN APP
// ==========================================

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("orderNestLoggedIn") === "true"
  );

  const [authMode, setAuthMode] = useState("login");

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loginError, setLoginError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [editingOrder, setEditingOrder] = useState(null);

  const [orders, setOrders] = useState([]);
  const [todayDeliveries, setTodayDeliveries] = useState([]);

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    pending_payments: 0,
    total_customers: 0,
    preparing_orders: 0,
    ready_orders: 0,
    delivery_orders: 0,
    delivered_orders: 0,
  });

  const [formData, setFormData] = useState({
    customer: "",
    phone: "",
    order: "",
    customization: "",
    deliveryDate: "",
    deliveryTime: "",
    totalAmount: "",
    advancePaid: "",
    status: "Pending",
  });

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError("");

    if (!loginData.username || !loginData.password) {
      setLoginError("Please enter username and password.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Invalid username or password"
        );
      }

      localStorage.setItem("orderNestToken", data.token);
      localStorage.setItem(
        "orderNestUsername",
        data.username
      );
      localStorage.setItem("orderNestLoggedIn", "true");

      setIsLoggedIn(true);
      setActivePage("dashboard");

    } catch (error) {
      setLoginError(error.message);
    }
  };

  // ==========================================
  // SIGNUP
  // ==========================================

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoginError("");

    if (
      !signupData.username ||
      !signupData.password ||
      !signupData.confirmPassword
    ) {
      setLoginError("Please fill in all fields.");
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setLoginError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: signupData.username,
          password: signupData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Signup failed"
        );
      }

      alert(
        "Account created successfully! Please login."
      );

      setLoginData({
        username: signupData.username,
        password: "",
      });

      setSignupData({
        username: "",
        password: "",
        confirmPassword: "",
      });

      setAuthMode("login");

    } catch (error) {
      setLoginError(error.message);
    }
  };

  // ==========================================
  // GET STATS
  // ==========================================

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${API_URL}/stats`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();

      setStats(data);

    } catch (error) {
      console.error(
        "Error fetching stats:",
        error
      );
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats();
    }
  }, [isLoggedIn, orders]);

  // ==========================================
  // GET ORDERS
  // ==========================================

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        `${API_URL}/orders`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();

      setOrders(
        Array.isArray(data) ? data : []
      );

    } catch (error) {
      console.error(
        "Error fetching orders:",
        error
      );

      setOrders([]);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
    }
  }, [isLoggedIn]);

  // ==========================================
  // TODAY'S DELIVERIES
  // ==========================================

  const fetchTodayDeliveries = async () => {
    try {
      const response = await fetch(
        `${API_URL}/today-deliveries`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch today's deliveries"
        );
      }

      const data = await response.json();

      setTodayDeliveries(
        Array.isArray(data) ? data : []
      );

    } catch (error) {
      console.error(
        "Error fetching today's deliveries:",
        error
      );

      setTodayDeliveries([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchTodayDeliveries();
    }
  }, [isLoggedIn, orders]);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // CREATE / UPDATE ORDER
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation

    if (!formData.customer.trim()) {
      alert("Please enter customer name.");
      return;
    }

    if (!formData.order.trim()) {
      alert("Please enter the order/product.");
      return;
    }

    if (!formData.deliveryDate) {
      alert("Please select a delivery date.");
      return;
    }

    if (!formData.deliveryTime) {
      alert("Please select a delivery time.");
      return;
    }

    if (
      !formData.totalAmount ||
      Number(formData.totalAmount) <= 0
    ) {
      alert("Please enter a valid total amount.");
      return;
    }

    if (Number(formData.advancePaid || 0) < 0) {
      alert(
        "Advance payment cannot be negative."
      );
      return;
    }

    if (
      Number(formData.advancePaid || 0) >
      Number(formData.totalAmount)
    ) {
      alert(
        "Advance payment cannot be greater than total amount."
      );
      return;
    }

    const orderData = {
      customer: formData.customer,
      phone: formData.phone || "",
      order: formData.order,
      customization: formData.customization,
      delivery_date: formData.deliveryDate,
      delivery_time: formData.deliveryTime,
      total_amount: Number(
        formData.totalAmount
      ),
      advance_paid: Number(
        formData.advancePaid || 0
      ),
      status: formData.status,
    };

    try {
      let response;

      // UPDATE
      if (editingOrder) {
        response = await fetch(
          `${API_URL}/orders/${editingOrder.id}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(orderData),
          }
        );
      }

      // CREATE
      else {
        response = await fetch(
          `${API_URL}/orders`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(orderData),
          }
        );
      }

      const responseData =
        await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.detail ||
            "Failed to save order"
        );
      }

      // Refresh orders with authentication
      await fetchOrders();

      setFormData({
        customer: "",
        phone: "",
        order: "",
        customization: "",
        deliveryDate: "",
        deliveryTime: "",
        totalAmount: "",
        advancePaid: "",
        status: "Pending",
      });

      setEditingOrder(null);
      setShowForm(false);

      alert(
        editingOrder
          ? "Order updated successfully!"
          : "Order created successfully!"
      );

    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Could not save the order."
      );
    }
  };

  // ==========================================
  // EDIT ORDER
  // ==========================================

  const handleEdit = (order) => {
    setEditingOrder(order);

    setFormData({
      customer: order.customer || "",
      phone: order.phone || "",
      order: order.order || "",
      customization:
        order.customization || "",
      deliveryDate:
        order.delivery_date || "",
      deliveryTime:
        order.delivery_time || "",
      totalAmount:
        order.total_amount || "",
      advancePaid:
        order.advance_paid || "",
      status:
        order.status || "Pending",
    });

    setShowForm(true);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem(
      "orderNestLoggedIn"
    );

    localStorage.removeItem(
      "orderNestToken"
    );

    localStorage.removeItem(
      "orderNestUsername"
    );

    setIsLoggedIn(false);
    setOrders([]);
    setTodayDeliveries([]);
    setActivePage("dashboard");
  };

  // ==========================================
  // LOGIN / SIGNUP SCREEN
  // ==========================================

  if (!isLoggedIn) {
    return (
      <div className="login-page">

        <div className="login-card">

          <div className="login-logo">
            🍰
          </div>

          <h1>OrderNest</h1>

          <p className="login-subtitle">
            {authMode === "login"
              ? "Sign in to manage your orders"
              : "Create your OrderNest account"}
          </p>

          {/* LOGIN */}

          {authMode === "login" ? (

            <form onSubmit={handleLogin}>

              <div className="login-field">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  placeholder="Enter username"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      username:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div className="login-field">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Enter password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({
                      ...loginData,
                      password:
                        e.target.value,
                    })
                  }
                />

              </div>

              {loginError && (
                <div className="login-error">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
              >
                Login
              </button>

              <p className="auth-switch">

                Don't have an account?{" "}

                <span
                  onClick={() => {
                    setAuthMode("signup");
                    setLoginError("");
                  }}
                >
                  Create Account
                </span>

              </p>

            </form>

          ) : (

            /* SIGNUP */

            <form onSubmit={handleSignup}>

              <div className="login-field">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  placeholder="Choose a username"
                  value={signupData.username}
                  onChange={(e) =>
                    setSignupData({
                      ...signupData,
                      username:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div className="login-field">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Create a password"
                  value={signupData.password}
                  onChange={(e) =>
                    setSignupData({
                      ...signupData,
                      password:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div className="login-field">

                <label>
                  Confirm Password
                </label>

                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={
                    signupData.confirmPassword
                  }
                  onChange={(e) =>
                    setSignupData({
                      ...signupData,
                      confirmPassword:
                        e.target.value,
                    })
                  }
                />

              </div>

              {loginError && (
                <div className="login-error">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
              >
                Create Account
              </button>

              <p className="auth-switch">

                Already have an account?{" "}

                <span
                  onClick={() => {
                    setAuthMode("login");
                    setLoginError("");
                  }}
                >
                  Login
                </span>

              </p>

            </form>
          )}

        </div>

      </div>
    );
  }

  // ==========================================
  // MAIN APPLICATION
  // ==========================================

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          🍰 <span>OrderNest</span>
        </div>

        <nav>

          <a
            className={
              activePage === "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            📊 Dashboard
          </a>

          <a
            className={
              activePage === "orders"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("orders")
            }
          >
            📦 Orders
          </a>

          <a
            className={
              activePage === "customers"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("customers")
            }
          >
            👥 Customers
          </a>

          <a
            className={
              activePage === "calendar"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("calendar")
            }
          >
            📅 Calendar
          </a>

          <a
            className={
              activePage === "payments"
                ? "active"
                : ""
            }
            onClick={() =>
              setActivePage("payments")
            }
          >
            💳 Payments
          </a>

        </nav>

        <div className="sidebar-bottom">

          <a>
            ⚙️ Settings
          </a>

          <a onClick={handleLogout}>
            🚪 Logout
          </a>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main">

        {/* =====================================
            DASHBOARD
        ===================================== */}

        {activePage === "dashboard" && (

          <>

            <header className="header">

              <div>

                <h1>
                  Good morning 👋
                </h1>

                <p>
                  Here's what's happening
                  with your orders today.
                </p>

              </div>

              <button
                className="add-button"
                onClick={() =>
                  setShowForm(true)
                }
              >
                + New Order
              </button>

            </header>

            {/* STATS */}

            <section className="stats">

              <div className="stat-card">

                <div className="stat-icon">
                  📦
                </div>

                <div>

                  <p>
                    Pending Orders
                  </p>

                  <h2>
                    {stats.pending_orders}
                  </h2>

                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon">
                  📅
                </div>

                <div>

                  <p>
                    Total Orders
                  </p>

                  <h2>
                    {stats.total_orders}
                  </h2>

                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon">
                  💰
                </div>

                <div>

                  <p>
                    Pending Payments
                  </p>

                  <h2>
                    ₹
                    {Number(
                      stats.pending_payments || 0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </h2>

                </div>

              </div>

              <div className="stat-card">

                <div className="stat-icon">
                  👥
                </div>

                <div>

                  <p>
                    Total Customers
                  </p>

                  <h2>
                    {stats.total_customers}
                  </h2>

                </div>

              </div>

            </section>

            {/* STATUS SUMMARY */}

            <div className="status-summary">

              <div className="status-summary-card">
                <span>
                  🟣 Preparing
                </span>

                <strong>
                  {stats.preparing_orders}
                </strong>
              </div>

              <div className="status-summary-card">
                <span>
                  🟢 Ready
                </span>

                <strong>
                  {stats.ready_orders}
                </strong>
              </div>

              <div className="status-summary-card">
                <span>
                  🚚 Out for Delivery
                </span>

                <strong>
                  {stats.delivery_orders}
                </strong>
              </div>

              <div className="status-summary-card">
                <span>
                  ✅ Delivered
                </span>

                <strong>
                  {stats.delivered_orders}
                </strong>
              </div>

            </div>

            {/* TODAY'S DELIVERIES */}

            <div className="today-deliveries">

              <div className="today-deliveries-header">

                <div>

                  <h2>
                    🚚 Today's Deliveries
                  </h2>

                  <p>
                    Orders scheduled for
                    delivery today.
                  </p>

                </div>

                <span className="delivery-count">
                  {todayDeliveries.length}{" "}
                  deliveries
                </span>

              </div>

              {todayDeliveries.length === 0 ? (

                <div className="no-deliveries">
                  🎉 No deliveries scheduled
                  for today.
                </div>

              ) : (

                <div className="delivery-list">

                  {todayDeliveries.map(
                    (delivery) => (

                      <div
                        className="delivery-item"
                        key={delivery.id}
                      >

                        <div className="delivery-main">

                          <div className="delivery-icon">
                            🚚
                          </div>

                          <div>

                            <strong>
                              {delivery.customer}
                            </strong>

                            <span>
                              {delivery.order}
                            </span>

                            <button
                              className="reminder-button"
                              onClick={() =>
                                alert(
                                  `Reminder: ${delivery.order} for ${delivery.customer} is scheduled today at ${String(
                                    delivery.delivery_time
                                  ).slice(0, 5)}.`
                                )
                              }
                            >
                              🔔 Remind Me
                            </button>

                          </div>

                        </div>

                        <div className="delivery-time">

                          <strong>
                            {String(
                              delivery.delivery_time
                            ).slice(0, 5)}
                          </strong>

                          <span>
                            {delivery.status}
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>
              )}

            </div>

            {/* RECENT ORDERS */}

            <section className="orders-section">

              <div className="section-header">

                <div>

                  <h2>
                    Recent Orders
                  </h2>

                  <p>
                    Keep track of your latest
                    orders.
                  </p>

                </div>

                <button
                  className="view-button"
                  onClick={() =>
                    setActivePage("orders")
                  }
                >
                  View All
                </button>

              </div>

              <div className="orders-table">

                <div className="table-header">

                  <span>
                    Customer
                  </span>

                  <span>
                    Order
                  </span>

                  <span>
                    Delivery
                  </span>

                  <span>
                    Payment
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Actions
                  </span>

                </div>

                {loading ? (

                  <p
                    style={{
                      padding: "30px",
                    }}
                  >
                    Loading orders...
                  </p>

                ) : orders.length === 0 ? (

                  <p
                    style={{
                      padding: "30px",
                    }}
                  >
                    No orders yet.
                  </p>

                ) : (

                  orders
                    .slice(0, 5)
                    .map(
                      (order, index) => (

                        <div
                          className="order-row"
                          key={
                            order.id || index
                          }
                        >

                          <span>
                            {order.customer}
                          </span>

                          <span>
                            {order.order}
                          </span>

                          <span>
                            {
                              order.delivery_date
                            }{" "}
                            {
                              order.delivery_time
                            }
                          </span>

                          <span>
                            ₹
                            {Number(
                              order.total_amount ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>

                          <span
                            className={`status ${String(
                              order.status
                            )
                              .toLowerCase()
                              .replace(
                                /\s+/g,
                                "-"
                              )}`}
                          >
                            {order.status}
                          </span>

                          <span>
                            —
                          </span>

                        </div>
                      )
                    )
                )}

              </div>

            </section>

          </>
        )}

        {/* =====================================
            ORDERS PAGE
        ===================================== */}

        {activePage === "orders" && (

          <OrdersPage
            orders={orders}
            setOrders={setOrders}
            setShowForm={setShowForm}
            handleEdit={handleEdit}
          />

        )}

        {/* =====================================
            CUSTOMERS PAGE
        ===================================== */}

        {activePage === "customers" && (

          <CustomersPage
            orders={orders}
          />

        )}

        {/* =====================================
            CALENDAR PAGE
        ===================================== */}

        {activePage === "calendar" && (

          <CalendarPage
            orders={orders}
          />

        )}

        {/* =====================================
            PAYMENTS PAGE
        ===================================== */}

        {activePage === "payments" && (

          <PaymentsPage
            orders={orders}
          />

        )}

        {/* =====================================
            NEW ORDER MODAL
        ===================================== */}

        {showForm && (

          <div className="modal-overlay">

            <div className="order-modal">

              <div className="modal-header">

                <div>

                  <h2>
                    {editingOrder
                      ? "Edit Order"
                      : "Create New Order"}
                  </h2>

                  <p>
                    Add customer and order
                    details
                  </p>

                </div>

                <button
                  className="close-button"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={handleSubmit}
              >

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Customer Name
                    </label>

                    <input
                      type="text"
                      name="customer"
                      value={
                        formData.customer
                      }
                      onChange={handleChange}
                      placeholder="Enter customer name"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={
                        formData.phone
                      }
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Order / Product
                    </label>

                    <input
                      type="text"
                      name="order"
                      value={
                        formData.order
                      }
                      onChange={handleChange}
                      placeholder="e.g. Chocolate Cake"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Delivery Date
                    </label>

                    <input
                      type="date"
                      name="deliveryDate"
                      value={
                        formData.deliveryDate
                      }
                      onChange={handleChange}
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Delivery Time
                    </label>

                    <input
                      type="time"
                      name="deliveryTime"
                      value={
                        formData.deliveryTime
                      }
                      onChange={handleChange}
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Total Amount
                    </label>

                    <input
                      type="number"
                      name="totalAmount"
                      value={
                        formData.totalAmount
                      }
                      onChange={handleChange}
                      placeholder="₹0"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Advance Paid
                    </label>

                    <input
                      type="number"
                      name="advancePaid"
                      value={
                        formData.advancePaid
                      }
                      onChange={handleChange}
                      placeholder="₹0"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Order Status
                    </label>

                    <select
                      name="status"
                      value={
                        formData.status
                      }
                      onChange={handleChange}
                    >

                      <option value="Pending">
                        Pending
                      </option>

                      <option value="Confirmed">
                        Confirmed
                      </option>

                      <option value="Preparing">
                        Preparing
                      </option>

                      <option value="Ready">
                        Ready
                      </option>

                      <option value="Out for Delivery">
                        Out for Delivery
                      </option>

                      <option value="Delivered">
                        Delivered
                      </option>

                    </select>

                  </div>

                </div>

                <div className="form-group full-width">

                  <label>
                    Customization Details
                  </label>

                  <textarea
                    name="customization"
                    value={
                      formData.customization
                    }
                    onChange={handleChange}
                    placeholder="Cake flavour, design, message, quantity, etc."
                    rows="4"
                  />

                </div>

                <div className="modal-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingOrder(null);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                  >
                    {editingOrder
                      ? "Update Order"
                      : "Save Order"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

// ==================================================
// ORDERS PAGE
// ==================================================

function OrdersPage({
  orders,
  setOrders,
  setShowForm,
  handleEdit,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // ==========================================
  // DELETE ORDER
  // ==========================================

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this order?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/orders/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to delete order"
        );
      }

      setOrders(
        (currentOrders) =>
          currentOrders.filter(
            (order) =>
              order.id !== id
          )
      );

      alert(
        "Order deleted successfully!"
      );

    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Could not delete the order."
      );
    }
  };

  // ==========================================
  // FILTER
  // ==========================================

  const filteredOrders =
    Array.isArray(orders)
      ? orders.filter((order) => {

          const customer =
            String(
              order.customer || ""
            ).toLowerCase();

          const product =
            String(
              order.order || ""
            ).toLowerCase();

          const searchText =
            search.toLowerCase();

          const matchesSearch =
            customer.includes(
              searchText
            ) ||
            product.includes(
              searchText
            );

          const matchesFilter =
            filter === "All" ||
            order.status === filter;

          return (
            matchesSearch &&
            matchesFilter
          );
        })
      : [];

  return (
    <div className="orders-page">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Orders
          </h1>

          <p>
            Manage your social-media
            orders and deliveries.
          </p>

        </div>

        <button
          className="add-button"
          onClick={() =>
            setShowForm(true)
          }
        >
          + New Order
        </button>

      </div>

      {/* SEARCH + FILTER */}

      <div className="orders-controls">

        <input
          type="text"
          placeholder="🔍 Search customer or order..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value
            )
          }
        >

          <option>
            All
          </option>

          <option>
            Pending
          </option>

          <option>
            Confirmed
          </option>

          <option>
            Preparing
          </option>

          <option>
            Ready
          </option>

          <option>
            Out for Delivery
          </option>

          <option>
            Delivered
          </option>

        </select>

      </div>

      {/* ORDERS CARD */}

      <div className="all-orders-card">

        <div className="orders-count">

          <strong>
            All Orders
          </strong>

          <span>
            {filteredOrders.length} orders
          </span>

        </div>

        <div className="table-header">

          <span>
            Customer
          </span>

          <span>
            Order
          </span>

          <span>
            Delivery
          </span>

          <span>
            Amount
          </span>

          <span>
            Status
          </span>

          <span>
            Actions
          </span>

        </div>

        {filteredOrders.length === 0 ? (

          <div className="empty-state">
            No orders found.
          </div>

        ) : (

          filteredOrders.map(
            (order, index) => (

              <div
                className="order-row"
                key={
                  order.id || index
                }
              >

                <span>
                  {order.customer}
                </span>

                <span>
                  {order.order}
                </span>

                <span>
                  {order.delivery_date}{" "}
                  {order.delivery_time}
                </span>

                <span>
                  ₹
                  {Number(
                    order.total_amount || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </span>

                <span
                  className={`status ${String(
                    order.status
                  )
                    .toLowerCase()
                    .replace(
                      /\s+/g,
                      "-"
                    )}`}
                >
                  {order.status}
                </span>

                <div className="order-actions">

                  <button
                    className="edit-button"
                    onClick={() =>
                      handleEdit(order)
                    }
                  >
                    ✏️ Edit
                  </button>

                  <button
                    className="delete-button"
                    onClick={() =>
                      handleDelete(
                        order.id
                      )
                    }
                  >
                    🗑️ Delete
                  </button>

                </div>

              </div>

            )
          )

        )}

      </div>

    </div>
  );
}

// ==================================================
// CUSTOMERS PAGE
// ==================================================

function CustomersPage({ orders }) {
  const customers = {};

  orders.forEach((order) => {
    const customerName =
      order.customer;

    if (!customers[customerName]) {
      customers[customerName] = {
        name: customerName,
        phone:
          order.phone ||
          "No phone",
        orders: [],
        totalAmount: 0,
        totalPaid: 0,
      };
    }

    customers[
      customerName
    ].orders.push(order);

    customers[
      customerName
    ].totalAmount += Number(
      order.total_amount || 0
    );

    customers[
      customerName
    ].totalPaid += Number(
      order.advance_paid || 0
    );
  });

  const customerList =
    Object.values(customers);

  return (
    <div className="page">

      <div className="page-header">

        <div>

          <h1>
            Customers
          </h1>

          <p>
            Manage your customers
            and their order history.
          </p>

        </div>

      </div>

      <div className="customer-grid">

        {customerList.length === 0 ? (

          <div className="empty-state">
            No customers found.
          </div>

        ) : (

          customerList.map(
            (customer) => {

              const pending =
                customer.totalAmount -
                customer.totalPaid;

              const latestOrder =
                customer.orders[
                  customer.orders.length - 1
                ];

              return (
                <div
                  className="customer-card"
                  key={customer.name}
                >

                  <div className="customer-top">

                    <div className="customer-avatar">
                      {customer.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>

                      <h3>
                        {customer.name}
                      </h3>

                      <p>
                        {customer.phone}
                      </p>

                    </div>

                  </div>

                  <div className="customer-info">

                    <div>
                      <span>
                        Orders
                      </span>

                      <strong>
                        {
                          customer.orders
                            .length
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total Spent
                      </span>

                      <strong>
                        ₹
                        {customer.totalAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Pending
                      </span>

                      <strong>
                        ₹
                        {pending.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="customer-delivery">

                    <span>
                      Latest Order
                    </span>

                    <strong>
                      {latestOrder?.order ||
                        "No order"}
                    </strong>

                    <small>
                      Delivery:{" "}
                      {latestOrder?.delivery_date ||
                        "N/A"}
                    </small>

                  </div>

                </div>
              );
            }
          )

        )}

      </div>

    </div>
  );
}

// ==================================================
// CALENDAR PAGE
// ==================================================

function CalendarPage({ orders }) {
  return (
    <div className="orders-page">

      <div className="page-header">

        <div>

          <h1>
            Delivery Calendar
          </h1>

          <p>
            Keep track of upcoming
            customer deliveries.
          </p>

        </div>

      </div>

      <div className="all-orders-card">

        <h2>
          Upcoming Deliveries
        </h2>

        {orders.length === 0 ? (

          <p>
            No deliveries scheduled.
          </p>

        ) : (

          orders.map(
            (order, index) => (

              <div
                className="order-row"
                key={
                  order.id || index
                }
              >

                <span>
                  📅{" "}
                  {order.delivery_date}
                </span>

                <span>
                  {order.order}
                </span>

                <span>
                  {order.delivery_time}
                </span>

                <span>
                  {order.customer}
                </span>

                <span
                  className={`status ${String(
                    order.status
                  )
                    .toLowerCase()
                    .replace(
                      /\s+/g,
                      "-"
                    )}`}
                >
                  {order.status}
                </span>

              </div>
            )
          )

        )}

      </div>

    </div>
  );
}

// ==================================================
// PAYMENTS PAGE
// ==================================================

function PaymentsPage({ orders }) {
  const totalAmount =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_amount || 0
        ),
      0
    );

  const totalPaid =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.advance_paid || 0
        ),
      0
    );

  const totalPending =
    totalAmount - totalPaid;

  return (
    <div className="page">

      <div className="page-header">

        <div>

          <h1>
            Payments
          </h1>

          <p>
            Track payments and pending
            amounts for your orders.
          </p>

        </div>

      </div>

      {/* PAYMENT SUMMARY */}

      <div className="payment-summary">

        <div className="payment-card">

          <span>
            Total Amount
          </span>

          <h2>
            ₹
            {totalAmount.toLocaleString(
              "en-IN"
            )}
          </h2>

        </div>

        <div className="payment-card">

          <span>
            Total Paid
          </span>

          <h2>
            ₹
            {totalPaid.toLocaleString(
              "en-IN"
            )}
          </h2>

        </div>

        <div className="payment-card">

          <span>
            Pending Amount
          </span>

          <h2>
            ₹
            {totalPending.toLocaleString(
              "en-IN"
            )}
          </h2>

        </div>

      </div>

      {/* PAYMENT TABLE */}

      <div className="orders-card">

        <div className="card-title">

          <h2>
            Payment Details
          </h2>

          <span>
            {orders.length} orders
          </span>

        </div>

        <div className="table-header payment-table">

          <span>
            Customer
          </span>

          <span>
            Order
          </span>

          <span>
            Total
          </span>

          <span>
            Paid
          </span>

          <span>
            Remaining
          </span>

          <span>
            Status
          </span>

        </div>

        {orders.length === 0 ? (

          <div className="empty-state">
            No payment records found.
          </div>

        ) : (

          orders.map(
            (order) => {

              const total =
                Number(
                  order.total_amount || 0
                );

              const paid =
                Number(
                  order.advance_paid || 0
                );

              const remaining =
                total - paid;

              const paymentStatus =
                paid >= total
                  ? "Paid"
                  : paid > 0
                  ? "Partially Paid"
                  : "Pending";

              return (
                <div
                  className="order-row payment-table"
                  key={order.id}
                >

                  <span>
                    {order.customer}
                  </span>

                  <span>
                    {order.order}
                  </span>

                  <span>
                    ₹
                    {total.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span>
                    ₹
                    {paid.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span>
                    ₹
                    {remaining.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span>

                    <span
                      className={`payment-status ${paymentStatus
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          "-"
                        )}`}
                    >
                      {paymentStatus}
                    </span>

                  </span>

                </div>
              );
            }
          )

        )}

      </div>

    </div>
  );
}

export default App;