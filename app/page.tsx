"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";
// Naya Tool: Charts ke liye
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [uniqueClients, setUniqueClients] = useState(0);
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clientName, setClientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [type, setType] = useState("");
  const [requirement, setRequirement] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [editQuoteStatus, setEditQuoteStatus] = useState("");
  const [editDealStatus, setEditDealStatus] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    }
    setLoading(false);
  }

  useEffect(() => {
    checkSecurityAndFetchData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
        "Quote Status": "Quote Shared"
      }]);

      if (error) throw error;
      setMessage(`✅ Lead Added! Code: ${quoteCode}`);
      await checkSecurityAndFetchData();
      
      setClientName(""); setEmailSubject(""); setType(""); setRequirement(""); setContactPerson("");
      setTimeout(() => { setIsModalOpen(false); setMessage(""); }, 1500);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (row: any) => {
    setEditingCode(row['Quote code']);
    setEditQuoteStatus(row['Quote Status'] || "");
    setEditDealStatus(row['Deal Status'] || "");
    setEditRemarks(row['Additional Remarks'] || "");
    setEditMessage("");
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditMessage("");

    try {
      const { error } = await supabase
        .from("Quote_Master_2026")
        .update({
          "Quote Status": editQuoteStatus,
          "Deal Status": editDealStatus,
          "Additional Remarks": editRemarks
        })
        .eq("Quote code", editingCode);

      if (error) throw error;

      setEditMessage("✅ Record Updated!");
      await checkSecurityAndFetchData(); 
      setTimeout(() => { setIsEditModalOpen(false); setEditMessage(""); }, 1500);
    } catch (error: any) {
      setEditMessage(`❌ Error: ${error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  // --- 📊 CHART DATA CALCULATION ---
  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = {
      "Won": 0,
      "Lost": 0,
      "Hold": 0,
      "Pending": 0
    };

    data.forEach((row) => {
      const status = row['Deal Status'] || "Pending";
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      } else {
        statusCounts["Pending"] += 1;
      }
    });

    return Object.keys(statusCounts).map(key => ({
      name: key,
      Quotes: statusCounts[key]
    }));
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
    <div style={{ padding: "40px", fontFamily: "sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh", position: "relative" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", margin: 0 }}>🚀 Sales Intelligence Core</h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: "#10b981", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>+ Add New Quote</button>
            <button onClick={handleLogout} style={{ backgroundColor: "#ef4444", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Logout</button>
          </div>
        </div>
        
        {loading ? (
          <p style={{ color: "#6b7280" }}>Data load ho raha hai...</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #3b82f6" }}>
                <p style={{ color: "#6b7280", fontSize: "14px", fontWeight: "600", marginBottom: "5px", textTransform: "uppercase" }}>Total Quotes</p>
                <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#111827", margin: 0 }}>{totalQuotes}</h2>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #10b981" }}>
                <p style={{ color: "#6b7280", fontSize: "14px", fontWeight: "600", marginBottom: "5px", textTransform: "uppercase" }}>Unique Clients</p>
                <h2 style={{ fontSize: "32px", fontWeight: "bold", color: "#111827", margin: 0 }}>{uniqueClients}</h2>
              </div>
            </div>

            {/* --- 📊 VISUAL ANALYTICS (CHART SECTION) --- */}
            <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
              <p style={{ marginBottom: "20px", color: "#374151", fontWeight: "bold", fontSize: "18px" }}>📊 Deal Status Overview</p>
              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="Quotes" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <p style={{ margin: 0, color: "#374151", fontWeight: "bold", fontSize: "18px" }}>Recent Quotes Data</p>
                <input type="text" placeholder="🔍 Search Client or Code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "10px", width: "300px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none" }} />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", color: "#374151" }}>
                      <th style={{ padding: "12px 15px", borderBottom: "2px solid #e5e7eb" }}>Quote Code</th>
                      <th style={{ padding: "12px 15px", borderBottom: "2px solid #e5e7eb" }}>Client Name</th>
                      <th style={{ padding: "12px 15px", borderBottom: "2px solid #e5e7eb" }}>Status</th>
                      <th style={{ padding: "12px 15px", borderBottom: "2px solid #e5e7eb" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row, index) => (
                        <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "12px 15px", color: "#4b5563", fontWeight: "bold" }}>{row['Quote code']}</td>
                          <td style={{ padding: "12px 15px", color: "#111827", fontWeight: "500" }}>{row['Company/Client Name']}</td>
                          <td style={{ padding: "12px 15px" }}>
                            <span style={{ backgroundColor: row['Deal Status'] === 'Won' ? '#d1fae5' : row['Deal Status'] === 'Lost' ? '#fee2e2' : '#f3f4f6', color: row['Deal Status'] === 'Won' ? '#065f46' : row['Deal Status'] === 'Lost' ? '#dc2626' : '#4b5563', padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                              {row['Deal Status'] || "Pending"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 15px" }}>
                            <button onClick={() => openEditModal(row)} style={{ backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", color: "#374151", fontWeight: "500", fontSize: "13px" }}>Edit ✏️</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>Koi record nahi mila...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e5e7eb" }}>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: "8px 15px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: currentPage === 1 ? "#f3f4f6" : "white", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Previous</button>
                  <span style={{ color: "#4b5563", fontSize: "14px" }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: "8px 15px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: currentPage === totalPages ? "#f3f4f6" : "white", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ADD POPUP */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "500px", position: "relative" }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✖</button>
            <h2>📝 Add New Quote</h2>
            {message && <div style={{ padding: "10px", marginBottom: "15px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "5px" }}>{message}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="text" placeholder="Client Name *" value={clientName} onChange={(e) => setClientName(e.target.value)} required style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }} />
              <input type="text" placeholder="Email Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }} />
              <button type="submit" disabled={formLoading} style={{ padding: "12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Submit</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT POPUP */}
      {isEditModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "500px", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <button onClick={() => setIsEditModalOpen(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#9ca3af" }}>✖</button>
            <h2 style={{ marginTop: 0, marginBottom: "5px", color: "#111827", fontSize: "22px" }}>Update Lead</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>Updating Code: <strong>{editingCode}</strong></p>

            {editMessage && <div style={{ padding: "12px", borderRadius: "6px", marginBottom: "20px", fontWeight: "bold", backgroundColor: editMessage.includes("✅") ? "#d1fae5" : "#fee2e2", color: editMessage.includes("✅") ? "#065f46" : "#dc2626" }}>{editMessage}</div>}

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>Quote Status</label>
                <select value={editQuoteStatus} onChange={(e) => setEditQuoteStatus(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                  <option value="">Select...</option>
                  <option value="Pending">Pending</option>
                  <option value="Quote Shared">Quote Shared</option>
                  <option value="Negotiation">Negotiation</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>Deal Status</label>
                <select value={editDealStatus} onChange={(e) => setEditDealStatus(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                  <option value="">Select...</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>Additional Remarks</label>
                <textarea value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} rows={3} placeholder="Type any remarks or updates here..." style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <button type="submit" disabled={editLoading} style={{ backgroundColor: "#10b981", color: "white", padding: "12px", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: editLoading ? "not-allowed" : "pointer", marginTop: "10px" }}>
                {editLoading ? "Updating..." : "Save Updates"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}