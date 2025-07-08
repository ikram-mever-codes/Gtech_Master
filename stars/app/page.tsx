"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  Activity,
  Search,
  Filter,
  Eye,
  Download,
  Plus,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  Truck,
  Box,
  ListChecks,
  FileText,
} from "lucide-react";
import { getAllListForACustomer, getCustomerDeliveries } from "@/api/lists";
import { useSelector } from "react-redux";
import { RootState } from "./Redux/store";
import { format } from "date-fns";
import theme from "@/styles/theme";

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listsData, setListsData] = useState<any[]>([]);
  const [deliveriesData, setDeliveriesData] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalLists: 0,
    activeLists: 0,
    totalItems: 0,
    pendingDeliveries: 0,
    deliveredItems: 0,
    upcomingDeliveries: 0,
  });

  const { customer } = useSelector((state: RootState) => state.customer);

  const fetchData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // Fetch lists for the customer
      const lists = await getAllListForACustomer(customer?.id || "");
      setListsData(lists);

      // Fetch deliveries for the customer
      const deliveries = await getCustomerDeliveries(customer?.id || "");
      setDeliveriesData(deliveries);

      // Calculate statistics
      const activeLists = lists.filter(
        (list: any) => list.status === "active"
      ).length;
      const totalItems = lists.reduce(
        (sum: any, list: any) => sum + list.items.length,
        0
      );

      const pendingDeliveries = deliveries.filter(
        (d: any) => d.status === "pending" || d.status === "partial"
      ).length;

      const deliveredItems = deliveries.filter(
        (d: any) => d.status === "delivered"
      ).length;

      const upcomingDeliveries = deliveries.filter(
        (d: any) =>
          new Date(d.scheduledDate) > new Date() &&
          (d.status === "pending" || d.status === "partial")
      ).length;

      setDashboardStats({
        totalLists: lists.length,
        activeLists,
        totalItems,
        pendingDeliveries,
        deliveredItems,
        upcomingDeliveries,
      });
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (customer?.id) {
      fetchData();
    }
  }, [customer]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Process deliveries data for charts
  const processDeliveryData = () => {
    const monthlyData: Record<
      string,
      {
        month: string;
        deliveries: number;
        items: number;
      }
    > = {};

    deliveriesData.forEach((delivery) => {
      const month = format(new Date(delivery.scheduledDate), "MMM yyyy");
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          deliveries: 0,
          items: 0,
        };
      }
      monthlyData[month].deliveries += 1;
      monthlyData[month].items += delivery.quantity;
    });

    return Object.values(monthlyData).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  };

  const deliveryTrends = processDeliveryData();

  // Get upcoming deliveries (next 30 days)
  const upcomingDeliveries = deliveriesData
    .filter((delivery) => {
      const deliveryDate = new Date(delivery.scheduledDate);
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 2);
      return deliveryDate >= today && deliveryDate <= nextMonth;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime()
    );

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-50 text-green-700 border-green-200",
      drafted: "bg-yellow-50 text-yellow-700 border-yellow-200",
      disabled: "bg-red-50 text-red-700 border-red-200",
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      partial: "bg-blue-50 text-blue-700 border-blue-200",
      delivered: "bg-green-50 text-green-700 border-green-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
      approved: "bg-green-50 text-green-700 border-green-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      colors[status as keyof typeof colors] ||
      "bg-gray-50 text-gray-700 border-gray-200"
    );
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const filteredLists = listsData.filter((list) => {
    const matchesSearch = list.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || list.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const StatCard = ({ title, value, icon: Icon, color = "primary" }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`p-3 rounded-lg ${
            color === "primary" ? "bg-green-50" : `bg-${color}-50`
          }`}
        >
          <Icon
            className={`w-6 h-6 ${
              color === "primary" ? "text-[#8CC21B]" : `text-${color}-600`
            }`}
          />
        </div>
      </div>
    </div>
  );

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#8CC21B]" />
        <span className="text-lg font-medium text-gray-600">
          Loading dashboard...
        </span>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">{error}</p>
        <button
          onClick={() => fetchData()}
          className="inline-flex items-center px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-[#7AB018] transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;
  if (error && listsData.length === 0) return <ErrorState />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] ">
      {/* Header */}
      <header className="sticky top-0 z-40 ">
        <div className="bg-white border-b border-gray-200  max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome Back,{" "}
                <span className={`px-2 text-2xl text-[#8CC21B]`}>
                  {customer?.companyName}
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-[#8CC21B] transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-[#8CC21B] focus:border-[#8CC21B]"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "overview", name: "Overview", icon: TrendingUp },
              { id: "orders", name: "My Orders", icon: Package },
              { id: "deliveries", name: "Deliveries", icon: Truck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-[#8CC21B] text-[#8CC21B]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Active Orders"
                value={dashboardStats.activeLists}
                icon={ListChecks}
                color="primary"
              />
              <StatCard
                title="Total Items Ordered"
                value={dashboardStats.totalItems}
                icon={Box}
                color="blue"
              />
              <StatCard
                title="Upcoming Deliveries"
                value={dashboardStats.upcomingDeliveries}
                icon={Truck}
                color="yellow"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Delivery Trends Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Delivery Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={deliveryTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="deliveries"
                      stroke="#8CC21B"
                      strokeWidth={3}
                      name="Deliveries"
                    />
                    <Line
                      type="monotone"
                      dataKey="items"
                      stroke="#262A2E"
                      strokeWidth={3}
                      name="Items"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Delivery Status */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Delivery Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Delivered",
                          value: dashboardStats.deliveredItems,
                        },
                        {
                          name: "Pending",
                          value: dashboardStats.pendingDeliveries,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent ? percent : 0 * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#8CC21B" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Deliveries */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Upcoming Deliveries
                  </h3>
                  <span className="text-sm text-gray-500">Next 60 days</span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {upcomingDeliveries.length > 0 ? (
                  upcomingDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {delivery.itemName} ({delivery.articleNumber})
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            From {delivery.listName}
                          </p>
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                            <span>Qty: {delivery.quantity}</span>
                            <span>•</span>
                            <span>
                              Scheduled:{" "}
                              {format(
                                new Date(delivery.scheduledDate),
                                "MMM dd, yyyy"
                              )}
                            </span>
                            <span>•</span>
                            <span>Cargo: {delivery.cargoNo}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                              delivery.status
                            )}`}
                          >
                            {delivery.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No upcoming deliveries in the next 30 days
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8CC21B] focus:border-[#8CC21B]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8CC21B] focus:border-[#8CC21B]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="drafted">Drafted</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Order Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Items
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Last Updated
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLists.length > 0 ? (
                      filteredLists.map((list) => (
                        <tr key={list.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {list.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {list.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {list.items.length}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                list.status
                              )}`}
                            >
                              {list.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getTimeAgo(list.updatedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-[#8CC21B] hover:text-[#7AB018] mr-3">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Deliveries Tab */}
        {activeTab === "deliveries" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Item
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Order
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Quantity
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Scheduled Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveriesData.length > 0 ? (
                      deliveriesData
                        .sort(
                          (a, b) =>
                            new Date(b.scheduledDate).getTime() -
                            new Date(a.scheduledDate).getTime()
                        )
                        .map((delivery) => (
                          <tr key={delivery.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {delivery.itemName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {delivery.articleNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {delivery.listName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {delivery.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(
                                new Date(delivery.scheduledDate),
                                "MMM dd, yyyy"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  delivery.status
                                )}`}
                              >
                                {delivery.status}
                              </span>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No deliveries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
