import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Search, 
  Download, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  FileText,
  Users,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { fetchWithAuth } from "../utils/auth";

// Chart components (simple implementation without external libraries)
const SimpleBarChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 w-20 truncate">{item.label}</span>
            <div className="flex-1 mx-3">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-900 w-16 text-right">
              ₱{item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleLineChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-48 flex items-end justify-between space-x-1">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="bg-blue-600 w-full rounded-t transition-all duration-300 hover:bg-blue-700"
              style={{ height: `${((item.value - minValue) / range) * 100}%` }}
              title={`${item.label}: ₱${item.value.toLocaleString()}`}
            />
            <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SalesManagement() {
  const [salesData, setSalesData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("7");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadSalesData();
    loadAnalyticsData();
    loadSummaryData();
  }, [dateFilter]);

  const loadSalesData = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/`);
      if (response.ok) {
        const data = await response.json();
        setSalesData(data.results || data);
      }
    } catch (error) {
      console.error("Error loading sales data:", error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/analytics/?days=${dateFilter}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
    }
  };

  const loadSummaryData = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/summary/?days=${dateFilter}`);
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      }
    } catch (error) {
      console.error("Error loading summary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return salesData.filter(sale => {
      const matchesSearch = !searchTerm || 
        sale.order_details?.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.id.toString().includes(searchTerm);
      
      const matchesPaymentMethod = paymentMethodFilter === "all" || 
        sale.payment_method === paymentMethodFilter;
      
      const matchesStatus = statusFilter === "all" || 
        sale.payment_status === statusFilter;
      
      return matchesSearch && matchesPaymentMethod && matchesStatus;
    });
  }, [salesData, searchTerm, paymentMethodFilter, statusFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-200";
      case "Refunded":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const exportSalesReport = async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/reports/`);
      if (response.ok) {
        const data = await response.json();
        
        // Create CSV content
        const csvContent = [
          ["Sale ID", "Order ID", "Customer", "Payment Date", "Payment Method", "Status", "Amount", "Reference"],
          ...data.report_data.map(sale => [
            sale.sale_id,
            sale.order_id,
            sale.customer,
            new Date(sale.payment_date).toLocaleDateString(),
            sale.payment_method,
            sale.payment_status,
            sale.total_amount,
            sale.payment_reference || ""
          ])
        ].map(row => row.join(",")).join("\n");
        
        // Download CSV
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-20">
          <div className="flex items-center gap-4">
            <Link to="/admin-orders">
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Orders
              </button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Management</h1>
              <p className="text-gray-500">Comprehensive sales analytics and reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportSalesReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "analytics", label: "Analytics", icon: TrendingUp },
                { id: "sales", label: "Sales List", icon: FileText },
                { id: "reports", label: "Reports", icon: PieChart }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{summaryData?.total_revenue?.toLocaleString() || 0}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Last {dateFilter} days</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryData?.total_sales || 0}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Completed transactions</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Order</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{summaryData?.total_sales ? (summaryData.total_revenue / summaryData.total_sales).toFixed(0) : 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Per transaction</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payment Methods</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(summaryData?.by_method || {}).length}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Active methods</p>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            {summaryData?.by_method && (
              <SimpleBarChart
                data={Object.entries(summaryData.by_method).map(([method, data]) => ({
                  label: method,
                  value: data.revenue
                }))}
                title="Revenue by Payment Method"
              />
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && analyticsData && (
          <div className="space-y-8">
            {/* Daily Trend Chart */}
            {analyticsData.daily_trend && analyticsData.daily_trend.length > 0 && (
              <SimpleLineChart
                data={analyticsData.daily_trend.map(item => ({
                  label: new Date(item.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  value: item.revenue
                }))}
                title="Daily Sales Trend"
              />
            )}

            {/* Top Products */}
            {analyticsData.top_products && analyticsData.top_products.length > 0 && (
              <SimpleBarChart
                data={analyticsData.top_products.map(item => ({
                  label: item.product__name,
                  value: item.total_revenue
                }))}
                title="Top Products by Revenue"
              />
            )}

            {/* Monthly Comparison */}
            {analyticsData.monthly_comparison && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Month</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-semibold">₱{analyticsData.monthly_comparison.current_month.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-semibold">{analyticsData.monthly_comparison.current_month.count}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Month</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-semibold">₱{analyticsData.monthly_comparison.last_month.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-semibold">{analyticsData.monthly_comparison.last_month.count}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sales List Tab */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search sales, customers, or references..."
                    className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
                  />
                </div>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="COD">Cash on Delivery</option>
                  <option value="Online">Online Payment</option>
                  <option value="GCash">GCash</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                  <option value="Refunded">Refunded</option>
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Sales Transactions</h2>
                <p className="text-sm text-gray-500">Complete sales history and details</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600">
                      <th className="px-6 py-3 font-medium">Sale ID</th>
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Method</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Reference</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">#{sale.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{sale.order_details?.user || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(sale.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                            <CreditCard className="h-3 w-3" />
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusBadgeClasses(sale.payment_status)}`}>
                            {getStatusIcon(sale.payment_status)}
                            {sale.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          ₱{parseFloat(sale.total_paid).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs">
                          {sale.payment_reference || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Reports</h2>
              <p className="text-gray-600 mb-6">Generate detailed sales reports with custom date ranges and filters.</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Quick Reports</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => exportSalesReport()}
                      className="w-full text-left px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Complete Sales Report
                    </button>
                    <button 
                      onClick={() => exportSalesReport()}
                      className="w-full text-left px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Monthly Sales Summary
                    </button>
                    <button 
                      onClick={() => exportSalesReport()}
                      className="w-full text-left px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Product Performance Report
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Custom Reports</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <input 
                          type="date" 
                          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                        <option value="">All Methods</option>
                        <option value="COD">Cash on Delivery</option>
                        <option value="Online">Online Payment</option>
                        <option value="GCash">GCash</option>
                      </select>
                    </div>
                    <button className="w-full px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm">
                      Generate Custom Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sale Details Modal */}
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedSale(null)} />
            <div className="relative bg-white w-full max-w-4xl mx-4 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sale Details - #{selectedSale.id}</h3>
                  <p className="text-sm text-gray-500">Complete transaction information</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-6 space-y-6">
                {/* Sale Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-900">Transaction Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sale ID:</span>
                          <span className="font-medium">#{selectedSale.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order ID:</span>
                          <span className="font-medium">#{selectedSale.order_details?.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Date:</span>
                          <span className="font-medium">{new Date(selectedSale.payment_date).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-medium text-green-600">₱{parseFloat(selectedSale.total_paid).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-900">Payment Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Method:</span>
                          <span className="font-medium">{selectedSale.payment_method}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(selectedSale.payment_status)}`}>
                            {getStatusIcon(selectedSale.payment_status)}
                            {selectedSale.payment_status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reference:</span>
                          <span className="font-medium">{selectedSale.payment_reference || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Handled By:</span>
                          <span className="font-medium">{selectedSale.handled_by_name || "System"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {selectedSale.order_details?.items && (
                  <div>
                    <h4 className="font-semibold mb-4 text-gray-900">Order Items</h4>
                    <div className="space-y-3">
                      {selectedSale.order_details.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{item.product?.name}</p>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">₱{parseFloat(item.price_at_purchase).toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Subtotal: ₱{parseFloat(item.subtotal).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSale.notes && (
                  <div>
                    <h4 className="font-semibold mb-2 text-gray-900">Notes</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedSale.notes}</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
