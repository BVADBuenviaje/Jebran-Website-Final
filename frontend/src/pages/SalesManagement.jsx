import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
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
const SimpleBarChart = ({ data, title, showUnpaid = false }) => {
  // Calculate max value considering both paid and unpaid if showUnpaid is true
  const maxValue = showUnpaid 
    ? Math.max(...data.map(d => (d.value || 0) + (d.unpaidValue || 0)), 1)
    : Math.max(...data.map(d => d.value || 0), 1);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {showUnpaid && (
        <div className="flex gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-600">Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-gray-600">Unpaid</span>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {data.map((item, index) => {
          const paidValue = item.value || 0;
          const unpaidValue = item.unpaidValue || 0;
          const totalValue = paidValue + unpaidValue;
          
          // Calculate total bar width as percentage of max value
          const totalBarWidth = maxValue > 0 ? (totalValue / maxValue) * 100 : 0;
          
          // Calculate proportions within the bar
          const paidProportion = totalValue > 0 ? (paidValue / totalValue) : 0;
          const unpaidProportion = totalValue > 0 ? (unpaidValue / totalValue) : 0;
          
          // Calculate actual widths within the total bar
          const paidWidth = totalBarWidth * paidProportion;
          const unpaidWidth = totalBarWidth * unpaidProportion;
          
          return (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 w-20 truncate">{item.label}</span>
            <div className="flex-1 mx-3">
                <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden" style={{ width: '100%' }}>
                  {/* Container for the actual bar content - scales to totalBarWidth */}
                  <div 
                    className="h-full relative"
                    style={{ width: `${totalBarWidth}%` }}
                  >
                    {/* Paid bar (blue) - fills from left */}
                    {paidValue > 0 && (
                      <div 
                        className="bg-blue-600 h-full absolute left-0 top-0 rounded-l transition-all duration-300 flex items-center justify-center"
                        style={{ width: `${paidProportion * 100}%` }}
                        title={`Paid: ₱${paidValue.toLocaleString()}`}
                      >
                        {totalBarWidth * paidProportion > 15 && (
                          <span className="text-white text-xs font-medium">₱{paidValue.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                    {/* Unpaid bar (red) - fills after paid */}
                    {showUnpaid && unpaidValue > 0 && (
                      <div 
                        className="bg-red-600 h-full absolute left-0 top-0 transition-all duration-300 flex items-center justify-center rounded-r"
                        style={{ 
                          width: `${unpaidProportion * 100}%`,
                          left: `${paidProportion * 100}%`
                        }}
                        title={`Unpaid: ₱${unpaidValue.toLocaleString()}`}
                      >
                        {totalBarWidth * unpaidProportion > 15 && (
                          <span className="text-white text-xs font-medium">₱{unpaidValue.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-900 w-32 text-right">
                {showUnpaid ? (
                  <div className="flex flex-col items-end">
                    <span className="text-blue-600">₱{paidValue.toLocaleString()}</span>
                    {unpaidValue > 0 && (
                      <span className="text-red-600 text-xs">₱{unpaidValue.toLocaleString()}</span>
                    )}
                  </div>
                ) : (
                  <span>₱{paidValue.toLocaleString()}</span>
                )}
              </div>
            </div>
          );
        })}
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Reports state
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportType, setReportType] = useState("sales");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customPaymentMethod, setCustomPaymentMethod] = useState("");
  const [customPaymentStatus, setCustomPaymentStatus] = useState("");

  const loadSalesData = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/`);
      if (response.ok) {
        const data = await response.json();
        setSalesData(data.results || data);
      }
    } catch (error) {
      console.error("Error loading sales data:", error);
    }
  }, []);

  const loadAnalyticsData = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/analytics/?days=${dateFilter}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
    }
  }, [dateFilter]);

  const loadSummaryData = useCallback(async () => {
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
  }, [dateFilter]);

  useEffect(() => {
    loadSalesData();
    loadAnalyticsData();
    loadSummaryData();
  }, [loadSalesData, loadAnalyticsData, loadSummaryData]);

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
      
      // Date range filtering
      let matchesDateRange = true;
      if (startDate || endDate) {
        const saleDate = new Date(sale.payment_date);
        saleDate.setHours(0, 0, 0, 0);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (saleDate < start) {
            matchesDateRange = false;
          }
        }
        
        if (endDate && matchesDateRange) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (saleDate > end) {
            matchesDateRange = false;
          }
        }
      }
      
      return matchesSearch && matchesPaymentMethod && matchesStatus && matchesDateRange;
    });
  }, [salesData, searchTerm, paymentMethodFilter, statusFilter, startDate, endDate]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Unpaid":
        return <XCircle className="h-4 w-4 text-red-600" />;
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
      case "Unpaid":
        return "bg-red-100 text-red-700 border-red-200";
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

  const generateReport = async (type, startDate = null, endDate = null, paymentMethod = null, paymentStatus = null) => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("report_type", type);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (paymentMethod) params.append("payment_method", paymentMethod);
      if (paymentStatus) params.append("payment_status", paymentStatus);
      
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/reports/?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Failed to generate report" }));
        alert(`Failed to generate report: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || !data.report_data || data.report_data.length === 0) {
      alert("No data to export");
      return;
    }

    let csvContent = "";
    
    if (data.report_type === "sales") {
      // Sales report CSV
      csvContent = [
        ["Sale ID", "Order ID", "Customer", "Payment Date", "Payment Method", "Status", "Amount", "Reference", "Handled By"],
        ...data.report_data.map(sale => [
          sale.sale_id,
          sale.order_id || "",
          sale.customer || "",
          sale.payment_date ? new Date(sale.payment_date).toLocaleDateString() : "",
          sale.payment_method || "",
          sale.payment_status || "",
          sale.total_amount || 0,
          sale.payment_reference || "",
          sale.handled_by || ""
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    } else if (data.report_type === "products") {
      // Product performance CSV
      csvContent = [
        ["Product ID", "Product Name", "Total Quantity", "Total Revenue", "Order Count", "Average Price"],
        ...data.report_data.map(product => [
          product.product_id || "",
          product.product_name || "",
          product.total_quantity || 0,
          product.total_revenue || 0,
          product.order_count || 0,
          product.average_price ? product.average_price.toFixed(2) : 0
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    } else if (data.report_type === "monthly") {
      // Monthly summary CSV
      csvContent = [
        ["Month", "Total Revenue", "Total Sales", "Paid Count", "Unpaid Count", "Average Sale"],
        ...data.report_data.map(month => [
          month.month_name || month.month || "",
          month.total_revenue || 0,
          month.total_sales || 0,
          month.paid_count || 0,
          month.unpaid_count || 0,
          month.average_sale ? month.average_sale.toFixed(2) : 0
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    }
    
    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${data.report_type}-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleQuickReport = (type) => {
    const today = new Date();
    let startDate, endDate;
    
    if (type === "monthly") {
      // Last 12 months
      endDate = today.toISOString().split('T')[0];
      const start = new Date(today);
      start.setMonth(start.getMonth() - 12);
      startDate = start.toISOString().split('T')[0];
      generateReport("monthly", startDate, endDate);
    } else if (type === "products") {
      // Last 30 days for products
      endDate = today.toISOString().split('T')[0];
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
      generateReport("products", startDate, endDate);
    } else {
      // Complete sales report - all time
      generateReport("sales");
    }
  };

  const handleCustomReport = () => {
    if (!customStartDate || !customEndDate) {
      alert("Please select both start and end dates");
      return;
    }
    generateReport(reportType, customStartDate, customEndDate, customPaymentMethod || null, customPaymentStatus || null);
  };

  const generateReceipt = async (saleId) => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_INVENTORY_URL}/sales/${saleId}/receipt/`);
      if (!response.ok) {
        throw new Error("Failed to fetch receipt data");
      }
      const receiptData = await response.json();
      
      // Create receipt HTML
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Official Receipt - ${receiptData.receipt_number}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              background: white;
              color: #000;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .receipt-header h1 {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .receipt-header p {
              font-size: 14px;
              color: #666;
            }
            .receipt-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-section h3 {
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            .info-section p {
              font-size: 14px;
              margin-bottom: 5px;
            }
            .receipt-number {
              text-align: right;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table thead {
              background: #000;
              color: #fff;
            }
            .items-table th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #ddd;
              font-size: 14px;
            }
            .items-table tbody tr:last-child td {
              border-bottom: 2px solid #000;
            }
            .text-right {
              text-align: right;
            }
            .totals {
              margin-top: 20px;
              margin-left: auto;
              width: 300px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .total-row.final {
              font-size: 20px;
              font-weight: bold;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 15px 0;
              margin-top: 10px;
            }
            .payment-info {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .payment-info p {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-paid {
              background: #10b981;
              color: white;
            }
            .status-unpaid {
              background: #ef4444;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <h1>Official Receipt</h1>
            <p>Jebran Miki</p>
            <p>Thank you for your purchase!</p>
          </div>
          
          <div class="receipt-number">
            Receipt No: ${receiptData.receipt_number}
          </div>
          
          <div class="receipt-info">
            <div class="info-section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${receiptData.customer.name}</p>
              ${receiptData.customer.email ? `<p><strong>Email:</strong> ${receiptData.customer.email}</p>` : ''}
              <p><strong>Date:</strong> ${receiptData.date_formatted}</p>
            </div>
            <div class="info-section">
              <h3>Transaction Details</h3>
              <p><strong>Sale ID:</strong> #${receiptData.sale_id}</p>
              <p><strong>Order ID:</strong> #${receiptData.order_id}</p>
              <p><strong>Status:</strong> <span class="status-badge ${receiptData.payment_status === 'Paid' ? 'status-paid' : 'status-unpaid'}">${receiptData.payment_status}</span></p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">₱${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">₱${item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₱${receiptData.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row final">
              <span>Total Amount:</span>
              <span>₱${receiptData.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <p><strong>Payment Method:</strong> ${receiptData.payment_method}</p>
            ${receiptData.payment_reference ? `<p><strong>Payment Reference:</strong> ${receiptData.payment_reference}</p>` : ''}
            <p><strong>Processed By:</strong> ${receiptData.handled_by}</p>
          </div>
          
          <div class="footer">
            <p>This is an official receipt for your records.</p>
            <p>For inquiries, please contact our customer service.</p>
            <p style="margin-top: 10px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;
      
      // Open print window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
      
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Failed to generate receipt. Please try again.");
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
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="mt-14 mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Management</h1>
            <p className="text-gray-500">Comprehensive sales analytics and reporting</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
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
            {/* Date Filter for Overview/Analytics */}
            <div className="flex justify-end">
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
                <p className="text-xs text-gray-500 mt-2">All transactions (paid + unpaid)</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Order</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{summaryData?.average_order ? summaryData.average_order.toFixed(0) : 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Per transaction (based on paid revenue)</p>
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
                  value: data.revenue || 0,
                  unpaidValue: data.unpaid_revenue || 0
                }))}
                title="Revenue by Payment Method"
                showUnpaid={true}
              />
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && analyticsData && (
          <div className="space-y-8">
            {/* Date Filter for Overview/Analytics */}
            <div className="flex justify-end">
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
                  <option value="GCash">GCash</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 whitespace-nowrap">Date Range:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
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
                      onClick={() => handleQuickReport("sales")}
                      disabled={reportLoading}
                      className="w-full text-left px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="h-4 w-4" />
                      Complete Sales Report
                    </button>
                    <button 
                      onClick={() => handleQuickReport("monthly")}
                      disabled={reportLoading}
                      className="w-full text-left px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Calendar className="h-4 w-4" />
                      Monthly Sales Summary
                    </button>
                    <button 
                      onClick={() => handleQuickReport("products")}
                      disabled={reportLoading}
                      className="w-full text-left px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                      <select 
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="sales">Sales Report</option>
                        <option value="products">Product Performance</option>
                        <option value="monthly">Monthly Summary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <input 
                          type="date" 
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select 
                        value={customPaymentMethod}
                        onChange={(e) => setCustomPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">All Methods</option>
                        <option value="COD">Cash on Delivery</option>
                        <option value="GCash">GCash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                      <select 
                        value={customPaymentStatus}
                        onChange={(e) => setCustomPaymentStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleCustomReport}
                      disabled={reportLoading}
                      className="w-full px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reportLoading ? "Generating..." : "Generate Custom Report"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Results */}
            {reportLoading && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating report...</p>
              </div>
            )}

            {reportData && !reportLoading && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {reportData.report_type === "sales" && "Sales Report"}
                      {reportData.report_type === "products" && "Product Performance Report"}
                      {reportData.report_type === "monthly" && "Monthly Summary Report"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {reportData.report_type === "sales" && `${reportData.report_data?.length || 0} sales found`}
                      {reportData.report_type === "products" && `${reportData.total_products || 0} products found`}
                      {reportData.report_type === "monthly" && `${reportData.total_months || 0} months found`}
                    </p>
                  </div>
                  <button
                    onClick={() => exportToCSV(reportData)}
                    className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>

                {/* Summary Statistics */}
                {reportData.summary && (
                  <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-xl font-bold text-gray-900">₱{reportData.summary.total_revenue?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Sales</p>
                      <p className="text-xl font-bold text-gray-900">{reportData.summary.total_sales || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="text-xl font-bold text-green-600">{reportData.summary.paid_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unpaid</p>
                      <p className="text-xl font-bold text-red-600">{reportData.summary.unpaid_count || 0}</p>
                    </div>
                  </div>
                )}

                {/* Report Data Table */}
                <div className="overflow-x-auto">
                  {reportData.report_type === "sales" && (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Sale ID</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Order ID</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Customer</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Method</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.report_data?.map((sale, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">#{sale.sale_id}</td>
                            <td className="px-4 py-3">#{sale.order_id}</td>
                            <td className="px-4 py-3">{sale.customer}</td>
                            <td className="px-4 py-3">{sale.payment_date ? new Date(sale.payment_date).toLocaleDateString() : "N/A"}</td>
                            <td className="px-4 py-3">{sale.payment_method}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                sale.payment_status === "Paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {sale.payment_status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">₱{sale.total_amount?.toLocaleString() || 0}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{sale.payment_reference || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportData.report_type === "products" && (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Product Name</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Quantity Sold</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Total Revenue</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Orders</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Avg Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.report_data?.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{product.product_name}</td>
                            <td className="px-4 py-3">{product.total_quantity}</td>
                            <td className="px-4 py-3 font-medium">₱{product.total_revenue?.toLocaleString() || 0}</td>
                            <td className="px-4 py-3">{product.order_count}</td>
                            <td className="px-4 py-3">₱{product.average_price?.toFixed(2) || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportData.report_type === "monthly" && (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Month</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Total Revenue</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Total Sales</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Paid</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Unpaid</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Avg Sale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.report_data?.map((month, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{month.month_name}</td>
                            <td className="px-4 py-3 font-medium">₱{month.total_revenue?.toLocaleString() || 0}</td>
                            <td className="px-4 py-3">{month.total_sales}</td>
                            <td className="px-4 py-3 text-green-600">{month.paid_count}</td>
                            <td className="px-4 py-3 text-red-600">{month.unpaid_count}</td>
                            <td className="px-4 py-3">₱{month.average_sale?.toFixed(2) || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
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
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => generateReceipt(selectedSale.id)}
                  className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Receipt
                </button>
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
