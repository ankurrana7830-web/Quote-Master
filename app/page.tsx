"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [uniqueClients, setUniqueClients] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const router = useRouter();

  // 🌙 NAYA: Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [type, setType] = useState("");
  const [requirement, setRequirement] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [revenue, setRevenue] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [editQuoteStatus, setEditQuoteStatus] = useState("");
  const [editDealStatus, setEditDealStatus] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editRevenue, setEditRevenue] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 🎨 Dark Mode Colors
  const theme = {
    bgMain: isDarkMode ? "#111827" : "#f3f4f6",
    bgCard: isDarkMode ? "#1f2937" : "white",
    textMain: isDarkMode ? "#f9fafb" : "#111827",
    textSub: isDarkMode ? "#9ca3af" : "#6b7280",
    border: isDarkMode ? "#374151" : "#e5e7eb",
    inputBg: isDarkMode ? "#374151" : "white",
    tableHeader: isDarkMode ? "#374151" : "#f9fafb",
  };

  async function checkSecurityAndFetchData() {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      router.push("/login");
      return; 
    }

    const { data: tableData, error } = await supabase.from("Quote_Master_2026").select("*");

    if (error) {
      console.error("Error fetching data:", error);
    } else if (tableData) {
      const reversedData = [...tableData].reverse(); 
      setData(reversedData);
      setTotalQuotes(reversedData.length);
      const clients = new Set(reversedData.map(item => item['Company/Client Name']));
      setUniqueClients(clients.size);
      
      const calculatedRevenue = reversedData.reduce((sum, row) => sum + (Number(row['Revenue']) || 0), 0);
      setTotalRevenue(calculatedRevenue);
    }
    setLoading(false);
  }

  useEffect(() => { checkSecurityAndFetchData(); }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 📥 NAYA FUNCTION: Data ko CSV/Excel mein Download Karne ke liye
  const exportToCSV = () => {
    if (data.length === 0) return alert("Koi data nahi hai!");
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(h => `"${('' + (row[h] || '')).replace(/"/g, '\\"')}"`);
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Sales_Data_${new Date().toLocaleDateString()}.csv`);
    a.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage("");

    try {
      const date = new Date();
      const monthYear = date.toLocaleString('en-US', { month: 'short' }).toUpperCase() + date.getFullYear().toString().slice(-2);
      const randomSeq = Math.floor(100 + Math.random() * 900);
      const quoteCode = `${monthYear}${randomSeq}`;

      const { error } = await supabase.from("Quote_Master_2026").insert([{
        "Quote code": quoteCode,
        "Company/Client Name": clientName,
        "Email Subject Line": emailSubject,
        "Type": type,
        "Requirement": requirement,
        "Company Contact Person": contactPerson,
        "Quote Requested Date": date.toLocaleDateString('en-US'),
        "Quote Status": "Quote Shared",
        "Revenue": Number(revenue) || 0 
      }]);

      if (error) throw error;

      // 📧 NAYA: Email Notification bhejna
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "ecd4a4e4-9ace-4df0-95ef-25165a19a32e", // ⚠️ YAHAN APNI KEY DAALEIN
          subject: `🚀 New Deal Added: ${clientName} (${quoteCode})`,
          message: `Hello Team, \n\nA new quote has been added to the Sales Intelligence Core.\n\n- Client: ${clientName}\n- Quote Code: ${quoteCode}\n- Expected Revenue: ₹${revenue}\n- Added On: ${date.toLocaleString()}\n\nKeep closing deals! 🔥`
        })
      });

      setMessage(`✅ Lead Added! Code: ${quoteCode}`);
      await checkSecurityAndFetchData();
      setClientName(""); setEmailSubject(""); setType(""); setRequirement(""); setContactPerson(""); setRevenue("");
      setTimeout(() => { setIsModalOpen(false); setMessage(""); }, 1500);
    } catch (error: any) { setMessage(`❌ Error: ${error.message}`); } finally { setFormLoading(false); }
  };

  const openEditModal = (row: any) => {
    setEditingCode(row['Quote code']);
    setEditQuoteStatus(row['Quote Status'] || "");
    setEditDealStatus(row['Deal Status'] || "");
    setEditRemarks(row['Additional Remarks'] || "");
    setEditRevenue(row['Revenue'] || ""); 
    setEditMessage("");
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditMessage("");

    try {
      const { error } = await supabase.from("Quote_Master_2026").update({
          "Quote Status": editQuoteStatus,
          "Deal Status": editDealStatus,
          "Additional Remarks": editRemarks,
          "Revenue": Number(editRevenue) || 0 
        }).eq("Quote code", editingCode);

      if (error) throw error;
      setEditMessage("✅ Record Updated!");
      await checkSecurityAndFetchData(); 
      setTimeout(() => { setIsEditModalOpen(false); setEditMessage(""); }, 1500);
    } catch (error: any) { setEditMessage(`❌ Error: ${error.message}`); } finally { setEditLoading(false); }
  };

  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = { "Won": 0, "Lost": 0, "Hold": 0, "Pending": 0 };
    data.forEach((row) => {
      const status = row['Deal Status'] || "Pending";
      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      else statusCounts["Pending"] += 1;
    });
    return Object.keys(statusCounts).map(key => ({ name: key, Quotes: statusCounts[key] }));
  }, [data]);

  const filteredData = data.filter((row) => {
    const searchLower = searchTerm.toLowerCase();
    const clientMatch = row['Company/Client Name']?.toLowerCase().includes(searchLower);
    const codeMatch = row['Quote code']?.toLowerCase().includes(searchLower);
    return clientMatch || codeMatch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", backgroundColor: theme.bgMain, minHeight: "100vh", position: "relative", transition: "all 0.3s ease" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: theme.textMain, margin: 0 }}>🚀 Sales Intelligence Core</h1>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* 🌙 NAYA BUTTON: Dark Mode Toggle */}
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ backgroundColor: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, padding: "10px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              {isDarkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button onClick={exportToCSV} style={{ backgroundColor: "#3b82f6", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>📥 CSV</button>
            <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: "#10b981", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>+ New Quote</button>
            <button onClick={handleLogout} style={{ backgroundColor: "#ef4444", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Logout</button>
          </div>
        </div>
        
        {loading ? ( <p style={{ color: theme.textSub }}>Data load ho raha hai...</p> ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              <div style={{ backgroundColor: theme.bgCard, padding: "20px", borderRadius: "10px", borderLeft: "4px solid #3b82f6", border: `1px solid ${theme.border}` }}>
                <p style={{ color: theme.textSub, fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>TOTAL QUOTES</p>
                <h2 style={{ fontSize: "32px", fontWeight: "bold", color: theme.textMain, margin: 0 }}>{totalQuotes}</h2>
              </div>
              <div style={{ backgroundColor: theme.bgCard, padding: "20px", borderRadius: "10px", borderLeft: "4px solid #8b5cf6", border: `1px solid ${theme.border}` }}>
                <p style={{ color: theme.textSub, fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>UNIQUE CLIENTS</p>
                <h2 style={{ fontSize: "32px", fontWeight: "bold", color: theme.textMain, margin: 0 }}>{uniqueClients}</h2>
              </div>
              <div style={{ backgroundColor: theme.bgCard, padding: "20px", borderRadius: "10px", borderLeft: "4px solid #10b981", border: `1px solid ${theme.border}` }}>
                <p style={{ color: theme.textSub, fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>TOTAL REVENUE</p>
                <h2 style={{ fontSize: "32px", fontWeight: "bold", color: theme.textMain, margin: 0 }}>₹ {totalRevenue.toLocaleString("en-IN")}</h2>
              </div>
            </div>

            <div style={{ backgroundColor: theme.bgCard, padding: "25px", borderRadius: "10px", border: `1px solid ${theme.border}`, marginBottom: "30px" }}>
              <p style={{ marginBottom: "20px", color: theme.textMain, fontWeight: "bold", fontSize: "18px" }}>📊 Deal Status Overview</p>
              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: theme.textSub}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: theme.textSub}} />
                    <Tooltip cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}} contentStyle={{backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textMain}} />
                    <Bar dataKey="Quotes" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ backgroundColor: theme.bgCard, padding: "25px", borderRadius: "10px", border: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <p style={{ margin: 0, color: theme.textMain, fontWeight: "bold", fontSize: "18px" }}>Recent Quotes</p>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "10px", width: "300px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "6px", outline: "none" }} />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.tableHeader, color: theme.textMain }}>
                      <th style={{ padding: "12px 15px", borderBottom: `2px solid ${theme.border}` }}>Code</th>
                      <th style={{ padding: "12px 15px", borderBottom: `2px solid ${theme.border}` }}>Client Name</th>
                      <th style={{ padding: "12px 15px", borderBottom: `2px solid ${theme.border}` }}>Revenue</th>
                      <th style={{ padding: "12px 15px", borderBottom: `2px solid ${theme.border}` }}>Status</th>
                      <th style={{ padding: "12px 15px", borderBottom: `2px solid ${theme.border}` }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row, index) => (
                        <tr key={index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: "12px 15px", color: theme.textSub, fontWeight: "bold" }}>{row['Quote code']}</td>
                          <td style={{ padding: "12px 15px", color: theme.textMain, fontWeight: "500" }}>{row['Company/Client Name']}</td>
                          <td style={{ padding: "12px 15px", color: "#10b981", fontWeight: "bold" }}>₹{row['Revenue'] || 0}</td>
                          <td style={{ padding: "12px 15px" }}>
                            <span style={{ backgroundColor: row['Deal Status'] === 'Won' ? '#065f46' : row['Deal Status'] === 'Lost' ? '#991b1b' : theme.tableHeader, color: row['Deal Status'] === 'Won' ? '#d1fae5' : row['Deal Status'] === 'Lost' ? '#fee2e2' : theme.textMain, padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                              {row['Deal Status'] || "Pending"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 15px" }}>
                            <button onClick={() => openEditModal(row)} style={{ backgroundColor: theme.bgMain, border: `1px solid ${theme.border}`, padding: "6px 12px", borderRadius: "4px", cursor: "pointer", color: theme.textMain }}>Edit ✏️</button>
                          </td>
                        </tr>
                      ))
                    ) : ( <tr><td colSpan={5} style={{ textAlign: "center", padding: "20px", color: theme.textSub }}>No Data</td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ADD POPUP */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: theme.bgCard, padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "500px", position: "relative" }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: theme.textSub }}>✖</button>
            <h2 style={{color: theme.textMain}}>📝 Add New Quote</h2>
            {message && <div style={{ padding: "10px", marginBottom: "15px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "5px" }}>{message}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="text" placeholder="Client Name *" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ padding: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "5px" }} />
              <input type="text" placeholder="Email Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={{ padding: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "5px" }} />
              <input type="number" placeholder="Expected Revenue (₹)" value={revenue} onChange={(e) => setRevenue(e.target.value)} style={{ padding: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "5px" }} />
              <button type="submit" disabled={formLoading} style={{ padding: "12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Submit</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT POPUP */}
      {isEditModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: theme.bgCard, padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "500px", position: "relative" }}>
            <button onClick={() => setIsEditModalOpen(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: theme.textSub }}>✖</button>
            <h2 style={{color: theme.textMain}}>Update Lead</h2>
            {editMessage && <div style={{ padding: "12px", borderRadius: "6px", marginBottom: "20px", backgroundColor: editMessage.includes("✅") ? "#d1fae5" : "#fee2e2", color: editMessage.includes("✅") ? "#065f46" : "#dc2626" }}>{editMessage}</div>}
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <select value={editQuoteStatus} onChange={(e) => setEditQuoteStatus(e.target.value)} style={{ padding: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "6px" }}><option value="">Status...</option><option value="Pending">Pending</option><option value="Quote Shared">Quote Shared</option></select>
              <select value={editDealStatus} onChange={(e) => setEditDealStatus(e.target.value)} style={{ padding: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "6px" }}><option value="">Deal...</option><option value="Won">Won</option><option value="Lost">Lost</option></select>
              <input type="number" placeholder="Final Revenue (₹)" value={editRevenue} onChange={(e) => setEditRevenue(e.target.value)} style={{ padding: "10px", border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, borderRadius: "6px" }} />
              <button type="submit" disabled={editLoading} style={{ backgroundColor: "#10b981", color: "white", padding: "12px", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>Save Updates</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}