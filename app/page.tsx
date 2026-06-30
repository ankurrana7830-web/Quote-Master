"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// 🟢 Exact Database Column Mapping for Volume ("Employees count")
const getVolume = (row: any) => {
  const val = row['Employees count'] || row['Employee count'] || row['Employees Count'] || row['Employee Count'];
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const parsedNumber = parseInt(cleaned, 10);
  return isNaN(parsedNumber) ? 0 : parsedNumber;
};

// Helper for revenue display in other tabs
const parseRevenue = (val: any) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  return Number(cleaned) || 0;
};

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]); 
  const [sourceData, setSourceData] = useState<any[]>([]); 

  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [userRole, setUserRole] = useState("Manager"); 
  const [userManagerName, setUserManagerName] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]); 
  
  const [activeTab, setActiveTab] = useState("overall"); 
  const [loading, setLoading] = useState(true);
  const [isSystemLive, setIsSystemLive] = useState(false); 
  const [isLightMode, setIsLightMode] = useState(false);
  const router = useRouter();

  // 🟢 CHANGED: overallMonthFilter state now handles string array for Multi-Select Checkboxes
  const [overallMonthFilter, setOverallMonthFilter] = useState<string[]>([]);
  const [overallAMFilter, setOverallAMFilter] = useState("All");

  // REGISTRY TABLE FILTERS (Multi-Select)
  const [regMinVol, setRegMinVol] = useState("");
  const [regMaxVol, setRegMaxVol] = useState("");
  const [regType, setRegType] = useState<string[]>([]);
  const [regStatus, setRegStatus] = useState<string[]>([]);
  const [regClient, setRegClient] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null); 
  
  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // SALES TAB FILTERS
  const [salesMonthFilter, setSalesMonthFilter] = useState("All");
  const [salesAMFilter, setSalesAMFilter] = useState("All");
  const [salesSourceFilter, setSalesSourceFilter] = useState("All");
  const [salesCenterFilter, setSalesCenterFilter] = useState("All");

  // MODALS & FORMS STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false);

  const [formLoading, setFormLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // MESSAGES
  const [message, setMessage] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [sourceMessage, setSourceMessage] = useState("");
  const [userMessage, setUserMessage] = useState({ text: "", type: "" });

  // ADD LEAD FORM DATA
  const [clientName, setClientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [type, setType] = useState("");
  const [requirement, setRequirement] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [accountManager, setAccountManager] = useState(""); 

  // EDIT/DELETE LEAD DATA
  const [editingCode, setEditingCode] = useState("");
  const [editQuoteStatus, setEditQuoteStatus] = useState("");
  const [editDealStatus, setEditDealStatus] = useState("");
  const [editClientResponse, setEditClientResponse] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editFollowupBy, setEditFollowupBy] = useState("");
  const [deletingCode, setDeletingCode] = useState("");

  // ADD CLIENT (SOURCE) DATA
  const [srcClientName, setSrcClientName] = useState("");
  const [srcContactPerson, setSrcContactPerson] = useState("");
  const [srcContactNumber, setSrcContactNumber] = useState("");
  const [srcAM, setSrcAM] = useState("");
  const [srcEmail, setSrcEmail] = useState("");
  const [srcCCEmail, setSrcCCEmail] = useState("");

  // USER MANAGEMENT DATA
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Manager");
  const [newUserManager, setNewUserManager] = useState("");
  const [editingUserEmail, setEditingUserEmail] = useState("");
  const [editingUserRole, setEditingUserRole] = useState("Manager");
  const [deletingUserEmail, setDeletingUserEmail] = useState("");

  // Theme Sync
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsLightMode(savedTheme === 'light');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsLightMode(!systemPrefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    localStorage.setItem('theme', newMode ? 'light' : 'dark');
  };

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.multi-select-container')) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch 1000+ data loop
  const fetchAllQuotes = async (currentManagerName: string, role: string) => {
    let allQuotes: any[] = [];
    let keepFetching = true;
    let start = 0;
    const step = 999;

    while (keepFetching) {
      let query = supabase.from("Quote_Master_2026").select("*").range(start, start + step);
      if (role === "Manager" && currentManagerName) {
        query = query.eq("Account Manager", currentManagerName);
      }
      const { data: chunk, error } = await query;
      if (error || !chunk || chunk.length === 0) {
        keepFetching = false;
      } else {
        allQuotes = [...allQuotes, ...chunk];
        if (chunk.length <= step) keepFetching = false;
        start += step + 1;
      }
    }
    return allQuotes.reverse(); 
  };

  const checkAuthAndFetchData = async () => {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      router.push("/login");
      return; 
    }
    const email = authData.session.user.email || "";
    setCurrentUserEmail(email);

    const { data: roleData } = await supabase.from("User_Roles").select("*").eq("email", email).single();
    let currentRole = "Manager"; 
    let currentManagerName = "";
    
    if (roleData) {
      currentRole = roleData.role;
      currentManagerName = roleData.manager_name;
      setUserRole(currentRole);
      setUserManagerName(currentManagerName);
    }

    const fullData = await fetchAllQuotes(currentManagerName, currentRole);
    setData(fullData);

    let revQuery = supabase.from("Revenue Data").select("*");
    if (currentRole === "Manager" && currentManagerName) {
      revQuery = revQuery.eq("Sales Manager", currentManagerName);
    }
    const { data: revData } = await revQuery;
    if (revData) setRevenueData(revData);

    const { data: srcData } = await supabase.from("Source Data").select("*");
    if (srcData) setSourceData(srcData);

    if (currentRole === "Admin") {
      const { data: usersList } = await supabase.from("User_Roles").select("*");
      if (usersList) setUsersList(usersList);
    }

    setLoading(false);
  };

  useEffect(() => { 
    checkAuthAndFetchData(); 

    const quoteChannel = supabase.channel('quote-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Quote_Master_2026' }, () => { checkAuthAndFetchData(); })
      .subscribe((status) => { if (status === 'SUBSCRIBED') setIsSystemLive(true); });

    const revenueChannel = supabase.channel('revenue-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'Revenue Data' }, () => { checkAuthAndFetchData(); }).subscribe();
    const sourceChannel = supabase.channel('source-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'Source Data' }, () => { checkAuthAndFetchData(); }).subscribe();
    const userChannel = supabase.channel('user-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'User_Roles' }, () => { checkAuthAndFetchData(); }).subscribe();

    return () => {
      supabase.removeChannel(quoteChannel);
      supabase.removeChannel(revenueChannel);
      supabase.removeChannel(sourceChannel);
      supabase.removeChannel(userChannel);
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // -----------------------------------------------------
  // 🟢 TAB 1: OVERALL SUMMARY LOGIC
  // -----------------------------------------------------
  const uniqueMonthsOverall = [...new Set(data.map(r => {
    const d = new Date(r['Quote Requested Date']);
    return !isNaN(d.getTime()) ? `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}` : null;
  }).filter(Boolean))];

  const uniqueAMsOverall = [...new Set(data.map(r => r['Account Manager']).filter(Boolean))];

  // 🟢 FIXED: Multi-Select Filter Logic
  const filteredOverallData = useMemo(() => {
    return data.filter(row => {
      const rowDate = new Date(row['Quote Requested Date']);
      const rowMonth = !isNaN(rowDate.getTime()) ? `${rowDate.toLocaleString('default', { month: 'short' })} ${rowDate.getFullYear()}` : 'Unknown';
      
      // 🟢 MAIN FIX: Ab array ki length check karega. Agar 0 hai toh sab dikhayega, warna jo select kiya hai wo dikhayega
      const matchMonth = overallMonthFilter.length === 0 || overallMonthFilter.includes(rowMonth);
      
      const matchAM = overallAMFilter === "All" || row['Account Manager'] === overallAMFilter;
      return matchMonth && matchAM;
    });
  }, [data, overallMonthFilter, overallAMFilter]);

  // EXACT KPI STATUS MAPPING
  const totalPipelineCount = filteredOverallData.length;
  
  const wonCount = filteredOverallData.filter(r => r['Quote Status'] === 'Deal Won').length;
  const lostCount = filteredOverallData.filter(r => r['Quote Status'] === 'Deal Lost').length;
  const pendingCount = filteredOverallData.filter(r => ['Negotiation', 'Quote Shared', 'Postponed'].includes(r['Quote Status'])).length;
  
  const conversionRateVal = totalPipelineCount > 0 ? ((wonCount / totalPipelineCount) * 100).toFixed(1) : "0.0";
  const lossRateVal = totalPipelineCount > 0 ? ((lostCount / totalPipelineCount) * 100).toFixed(1) : "0.0";
  const negotiationRateVal = totalPipelineCount > 0 ? ((pendingCount / totalPipelineCount) * 100).toFixed(1) : "0.0";

  // Ascending Chronological Trajectory
  const volumeTrajectoryData = useMemo(() => {
    const grouped: Record<string, { count: number, dateObj: Date }> = {};
    filteredOverallData.forEach(row => {
      const rowDate = new Date(row['Quote Requested Date']);
      if (!isNaN(rowDate.getTime())) {
        const m = `${rowDate.toLocaleString('default', { month: 'short' })} ${rowDate.getFullYear().toString().slice(-2)}`;
        if (!grouped[m]) grouped[m] = { count: 0, dateObj: rowDate };
        grouped[m].count += 1; 
      }
    });
    return Object.keys(grouped)
      .map(key => ({ name: key, Volume: grouped[key].count, rawDate: grouped[key].dateObj }))
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()); 
  }, [filteredOverallData]);

  const channelAllocationData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredOverallData.forEach(row => {
      const type = row['Type'] || 'Other';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
  }, [filteredOverallData]);
  const pieColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899'];

  const pipelineDistributionData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredOverallData.forEach(row => {
      const status = row['Quote Status'] || 'Pending';
      grouped[status] = (grouped[status] || 0) + 1;
    });
    return Object.keys(grouped).sort((a,b) => grouped[b] - grouped[a]).slice(0,7).map(key => ({ name: key, Count: grouped[key] }));
  }, [filteredOverallData]);

  // Registry Filters Logic
  const registryUniqueTypes = [...new Set(filteredOverallData.map(r => r['Type']).filter(Boolean))];
  const registryUniqueStatuses = [...new Set(filteredOverallData.map(r => r['Quote Status']).filter(Boolean))];
  const registryUniqueClients = [...new Set(filteredOverallData.map(r => r['Company/Client Name']).filter(Boolean))];

  const tableFilteredData = useMemo(() => {
    let tData = filteredOverallData.filter(row => {
      const vol = getVolume(row);
      const searchLower = searchTerm.toLowerCase();
      
      const passSearch = (row['Quote code'] && String(row['Quote code']).toLowerCase().includes(searchLower)) || 
                         (row['Company/Client Name'] && String(row['Company/Client Name']).toLowerCase().includes(searchLower));
                         
      const passMin = regMinVol === "" || vol >= Number(regMinVol);
      const passMax = regMaxVol === "" || vol <= Number(regMaxVol);
      const passType = regType.length === 0 || regType.includes(row['Type']);
      const passStatus = regStatus.length === 0 || regStatus.includes(row['Quote Status']);
      const passClient = regClient === "All" || row['Company/Client Name'] === regClient;
      
      return passSearch && passMin && passMax && passType && passStatus && passClient;
    });
    // Volume descending
    return tData.sort((a, b) => getVolume(b) - getVolume(a));
  }, [filteredOverallData, searchTerm, regMinVol, regMaxVol, regType, regStatus, regClient]);

  const totalPages = Math.ceil(tableFilteredData.length / rowsPerPage);
  const currentTableData = tableFilteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // -----------------------------------------------------
  // 🟢 TAB 2: SALES INTELLIGENCE LOGIC
  // -----------------------------------------------------
  const uniqueMonths = [...new Set(revenueData.map(r => r['Month Date']).filter(Boolean))];
  const uniqueAMs = [...new Set(revenueData.map(r => r['Sales Manager']).filter(Boolean))];
  const uniqueSources = [...new Set(revenueData.map(r => r['Source Type']).filter(Boolean))];
  const uniqueCenters = [...new Set(revenueData.map(r => r['Center Name']).filter(Boolean))];

  const filteredRevenueData = useMemo(() => {
    return revenueData.filter(row => {
      const matchMonth = salesMonthFilter === "All" || row['Month Date'] === salesMonthFilter;
      const matchAM = salesAMFilter === "All" || row['Sales Manager'] === salesAMFilter;
      const matchSource = salesSourceFilter === "All" || row['Source Type'] === salesSourceFilter;
      const matchCenter = salesCenterFilter === "All" || row['Center Name'] === salesCenterFilter;
      return matchMonth && matchAM && matchSource && matchCenter;
    });
  }, [revenueData, salesMonthFilter, salesAMFilter, salesSourceFilter, salesCenterFilter]);

  const salesChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredRevenueData.forEach(row => {
      const m = row['Month Date'] || 'Unknown';
      grouped[m] = (grouped[m] || 0) + parseRevenue(row['prevenue']);
    });
    return Object.keys(grouped).map(key => ({ name: key, Revenue: grouped[key] }));
  }, [filteredRevenueData]);

  // -----------------------------------------------------
  // 🟢 FORMS & CRUD OPERATIONS LOGIC
  // -----------------------------------------------------
  const formUniqueTypes = [...new Set(data.map(r => r['Type']).filter(Boolean))];
  const sourceClients = [...new Set(sourceData.map(r => r['Company/Client Name']).filter(Boolean))];
  const sourceAMsList = [...new Set(sourceData.map(r => r['Account manager name']).filter(Boolean))];

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedClient = e.target.value;
    setClientName(selectedClient);
    const foundClient = sourceData.find(row => row['Company/Client Name'] === selectedClient);
    if (foundClient) {
      if (foundClient['Company Contact Person']) setContactPerson(foundClient['Company Contact Person']);
      if (foundClient['Account manager name']) setAccountManager(foundClient['Account manager name']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true); setMessage("");
    try {
      const date = new Date();
      const monthStr = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const yearStr = date.getFullYear().toString().slice(-2);
      const prefix = `${monthStr}${yearStr}`; 
      let maxSeq = 0;
      data.forEach((row) => {
        const code = row['Quote code'];
        if (code && code.startsWith(prefix)) {
          const numPart = parseInt(code.replace(prefix, ''), 10);
          if (!isNaN(numPart) && numPart > maxSeq) maxSeq = numPart;
        }
      });
      const quoteCode = `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
      const finalManager = userRole === 'Manager' ? userManagerName : accountManager;

      const { error } = await supabase.from("Quote_Master_2026").insert([{
        "Quote code": quoteCode, "Company/Client Name": clientName, "Email Subject Line": emailSubject, "Type": type, "Requirement": requirement, "Company Contact Person": contactPerson, "Account Manager": finalManager, "Quote Requested Date": date.toLocaleDateString('en-US'), "Quote Status": "Quote Shared", "Revenue": 0 
      }]);
      if (error) throw error;
      setMessage(`Lead Added Successfully! Code: ${quoteCode}`);
      setClientName(""); setEmailSubject(""); setType(""); setRequirement(""); setContactPerson(""); setAccountManager("");
      setTimeout(() => { setIsModalOpen(false); setMessage(""); }, 1500);
    } catch (error: any) { setMessage(`Error: ${error.message}`); } finally { setFormLoading(false); }
  };

  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true); setSourceMessage("");
    try {
      const finalAM = userRole === 'Manager' ? userManagerName : srcAM;
      const { error } = await supabase.from("Source Data").insert([{
        "Company/Client Name": srcClientName, "Company Contact Person": srcContactPerson, "CompanyContactNumber": srcContactNumber, "Account manager name": finalAM, "Email ID": srcEmail, "CC Email ID": srcCCEmail
      }]);
      if (error) throw error;
      setSourceMessage(`Client Added Successfully!`);
      setClientName(srcClientName); setContactPerson(srcContactPerson); setAccountManager(finalAM);
      setSrcClientName(""); setSrcContactPerson(""); setSrcContactNumber(""); setSrcAM(""); setSrcEmail(""); setSrcCCEmail("");
      setTimeout(() => { setIsSourceModalOpen(false); setSourceMessage(""); }, 1500);
    } catch (error: any) { setSourceMessage(`Error: ${error.message}`); } finally { setFormLoading(false); }
  };

  // OPEN MODAL HELPERS
  const openEditModal = (row: any) => {
    setEditingCode(row['Quote code']);
    setEditQuoteStatus(row['Quote Status'] || "");
    setEditDealStatus(row['Deal Status'] || "");
    setEditClientResponse(row['Client Response Status'] || "");
    setEditRemarks(row['Additional Remarks'] || "");
    setEditFollowupBy(userManagerName); 
    setEditMessage("");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (code: string) => {
    setDeletingCode(code);
    setDeleteMessage("");
    setIsDeleteModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true); setEditMessage("");
    try {
      const { error } = await supabase.from("Quote_Master_2026").update({
          "Quote Status": editQuoteStatus, 
          "Deal Status": editDealStatus, 
          "Client Response Status": editClientResponse, 
          "Followup By": editFollowupBy, 
          "Additional Remarks": editRemarks
        }).eq("Quote code", editingCode);
        
        if (error) throw error;
      setEditMessage("Record Updated Successfully!");
      setTimeout(() => { setIsEditModalOpen(false); setEditMessage(""); }, 1500);
    } catch (error: any) { setEditMessage(`Error: ${error.message}`); } finally { setFormLoading(false); }
  };

  const confirmDelete = async () => {
    setFormLoading(true); setDeleteMessage("");
    try {
      const { error } = await supabase.from("Quote_Master_2026").delete().eq("Quote code", deletingCode);
      if (error) throw error;
      setDeleteMessage("Lead Deleted Successfully!");
      setTimeout(() => { setIsDeleteModalOpen(false); setDeleteMessage(""); }, 1500);
    } catch (error: any) { setDeleteMessage(`Error: ${error.message}`); } finally { setFormLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true); setUserMessage({ text: "", type: "" });
    try {
      const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole, managerName: newUserManager }) });
      const result = await res.json();
      if (result.success) {
        setUserMessage({ text: "Employee Account Configured!", type: "success" });
        setNewUserEmail(""); setNewUserPassword(""); setNewUserManager(""); setNewUserRole("Manager");
        checkAuthAndFetchData();
      } else setUserMessage({ text: `${result.error}`, type: "error" });
    } catch (error: any) { setUserMessage({ text: "Connection Error", type: "error" }); } finally { setFormLoading(false); setTimeout(() => setUserMessage({ text: "", type: "" }), 3000); }
  };

  const handleUpdateUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const { error } = await supabase.from("User_Roles").update({ role: editingUserRole }).eq("email", editingUserEmail);
      if (error) throw error;
      await checkAuthAndFetchData();
      setIsUserEditModalOpen(false);
    } catch (error: any) { alert(`Error: ${error.message}`); } finally { setFormLoading(false); }
  };

  const confirmDeleteUser = async () => {
    setFormLoading(true);
    try {
      const res = await fetch('/api/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: deletingUserEmail }) });
      const result = await res.json();
      if (result.success) { await checkAuthAndFetchData(); setIsUserDeleteModalOpen(false); } 
      else alert(`Error: ${result.error}`);
    } catch (error: any) { alert(`Server error`); } finally { setFormLoading(false); }
  };

  const handleEmailTrigger = async (type: string) => {
    setEmailLoading(true);
    try {
      const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      const result = await res.json();
      if (result.success) alert(`Success: ${result.message}`); else alert(`Error: ${result.error}`);
    } catch (error) { alert("Server Error."); } finally { setEmailLoading(false); }
  };

  // EXPORT TO CSV LOGIC
  const exportToCSV = () => {
    const headers = ["Quote code", "Company/Client Name", "Type", "Account Manager", "Quote Status", "Volume"];
    const csvRows = [headers.join(",")];
    
    tableFilteredData.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (header === "Volume") val = getVolume(row); 
        return `"${(val || '').toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', ''); 
    a.setAttribute('href', url); 
    a.setAttribute('download', 'Active_Deal_Registry.csv');
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
  };

  const glassInputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all backdrop-blur-sm text-sm ${isLightMode ? 'bg-white/60 border border-slate-300 focus:bg-white focus:border-[#0f2e5a] text-slate-800' : 'bg-black/30 border border-white/10 focus:bg-black/50 focus:border-cyan-500 text-white placeholder-slate-500'}`;
  const cardClass = isLightMode ? 'bg-white/90 border-slate-200 shadow-sm' : 'bg-[#111318] border border-white/5 shadow-2xl';

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-700 font-sans ${isLightMode ? 'bg-[#f8fafc] text-slate-800' : 'bg-[#0a0a0a] text-slate-200'}`}>
      
      {/* 🌐 TOP NAVIGATION BAR (FULL SCREEN WIDTH) */}
      <div className={`relative z-10 backdrop-blur-xl border-b transition-all w-full px-4 md:px-8 py-4 flex justify-between items-center ${isLightMode ? 'bg-white/60 border-white/80 shadow-sm' : 'bg-[#111318] border-white/5'}`}>
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg object-cover shadow-md" />
          <div>
            <h1 className="font-black text-xl tracking-[0.15em] uppercase">Intelligence Core</h1>
            <p className={`text-[9px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-cyan-400'}`}>
              Welcome, {userRole === 'Admin' ? 'Admin' : userManagerName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4 text-xs font-bold bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            {isSystemLive ? <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span className="text-emerald-500">LIVE</span></> : <><span className="w-2 h-2 rounded-full bg-rose-500"></span> <span className="text-rose-500">OFFLINE</span></>}
          </div>
          <button onClick={() => setIsModalOpen(true)} className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-lg ${isLightMode ? 'bg-[#0f2e5a] hover:bg-[#153e7a] text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'}`}>
            <i className="fas fa-plus mr-2"></i> New Quote
          </button>
          <button onClick={toggleTheme} className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${isLightMode ? 'bg-white/50 border-slate-300 text-slate-700 hover:bg-white' : 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10'}`}>
            <i className={`fas ${isLightMode ? 'fa-moon' : 'fa-sun'}`}></i>
          </button>
          <button onClick={handleLogout} className="px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20">
            <i className="fas fa-power-off"></i>
          </button>
        </div>
      </div>

      {/* 📊 MAIN CONTENT (FULL SCREEN WIDTH) */}
      <div className="relative z-10 p-4 md:p-8 w-full max-w-full mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64"><i className="fas fa-circle-notch fa-spin text-4xl text-cyan-500"></i></div>
        ) : (
          <>
            {/* TABS NAVIGATION */}
            <div className="flex flex-wrap gap-4 mb-8 border-b border-slate-500/20 pb-4 overflow-x-auto">
              <button onClick={() => setActiveTab("overall")} className={`px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === "overall" ? (isLightMode ? 'bg-[#0f2e5a] text-white shadow-lg' : 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]') : (isLightMode ? 'bg-white/50 text-slate-500 hover:bg-white' : 'bg-white/5 text-slate-400 hover:bg-white/10')}`}><i className="fas fa-chart-pie mr-2"></i>Overall Summary</button>
              <button onClick={() => setActiveTab("sales")} className={`px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === "sales" ? (isLightMode ? 'bg-[#0f2e5a] text-white shadow-lg' : 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]') : (isLightMode ? 'bg-white/50 text-slate-500 hover:bg-white' : 'bg-white/5 text-slate-400 hover:bg-white/10')}`}><i className="fas fa-brain mr-2"></i>Sales Intelligence</button>
              {userRole === 'Admin' && (
                <>
                  <button onClick={() => setActiveTab("executive")} className={`px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === "executive" ? (isLightMode ? 'bg-[#0f2e5a] text-white shadow-lg' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]') : (isLightMode ? 'bg-white/50 text-slate-500 hover:bg-white' : 'bg-white/5 text-slate-400 hover:bg-white/10')}`}><i className="fas fa-user-tie mr-2"></i>Executive Overview</button>
                  <button onClick={() => setActiveTab("users")} className={`px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === "users" ? (isLightMode ? 'bg-[#0f2e5a] text-white shadow-lg' : 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]') : (isLightMode ? 'bg-white/50 text-slate-500 hover:bg-white' : 'bg-white/5 text-slate-400 hover:bg-white/10')}`}><i className="fas fa-users-gear mr-2"></i>User Mgmt</button>
                </>
              )}
            </div>

            {/* ================= TAB 1: OVERALL SUMMARY ================= */}
            {activeTab === "overall" && (
              <div className="space-y-6 animate-fade-in w-full">
                
                {/* 🟢 CHANGED: Filter By Month updated to Custom Multi-Select Dropdown Checkbox */}
                <div className={`p-4 rounded-2xl flex flex-wrap gap-4 items-end multi-select-container ${cardClass}`}>
                  <div className="relative flex-1 min-w-[200px]">
                    <label className={`text-[10px] uppercase tracking-wider font-bold mb-2 block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Filter By Month</label>
                    <div onClick={() => setOpenFilter(openFilter === 'overallMonth' ? null : 'overallMonth')} className={`cursor-pointer w-full px-4 py-3 rounded-xl text-xs outline-none border flex justify-between items-center ${isLightMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#1e232e] border-white/5 text-white'}`}>
                      <span className="truncate">{overallMonthFilter.length === 0 ? "All Months" : `${overallMonthFilter.length} Selected`}</span>
                      <i className="fas fa-chevron-down text-[10px]"></i>
                    </div>
                    {openFilter === 'overallMonth' && (
                      <div className={`absolute top-full left-0 w-full mt-1 border rounded-lg shadow-xl z-50 p-2 max-h-48 overflow-y-auto ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/10'}`}>
                        {uniqueMonthsOverall.map(m => (
                          <label key={m as string} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${isLightMode ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-white/5'}`}>
                            <input type="checkbox" checked={overallMonthFilter.includes(m as string)} onChange={(e) => {
                              if(e.target.checked) setOverallMonthFilter([...overallMonthFilter, m as string]);
                              else setOverallMonthFilter(overallMonthFilter.filter(x => x !== m));
                            }} /> {m as string}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {userRole === 'Admin' && (
                    <div className="flex-1 min-w-[200px]">
                      <label className={`text-[10px] uppercase tracking-wider font-bold mb-2 block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Account Manager</label>
                      <select value={overallAMFilter} onChange={(e) => setOverallAMFilter(e.target.value)} className={`w-full rounded-xl px-4 py-3 text-xs outline-none transition-all ${isLightMode ? 'bg-slate-100 border-none' : 'bg-[#1e232e] border border-white/5 text-white'}`}>
                        <option value="All">All Account Managers</option>
                        {uniqueAMsOverall.map((am, i) => <option key={i} value={am as string}>{am as string}</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={() => { setOverallMonthFilter([]); setOverallAMFilter("All"); setSearchTerm(""); setRegMinVol(""); setRegMaxVol(""); setRegType([]); setRegStatus([]); setRegClient("All"); }} className={`px-5 py-3 rounded-xl text-xs font-bold transition-all h-[44px] ${isLightMode ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                    <i className="fas fa-filter-circle-xmark mr-2"></i> Clear All Filters
                  </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group ${cardClass}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] -mr-10 -mt-10 rounded-full"></div>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Pipeline</p>
                        <i className="fas fa-file-invoice text-cyan-500 opacity-80"></i>
                      </div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-cyan-500">{totalPipelineCount}</h2>
                      </div>
                    </div>
                    <p className="text-[10px] mt-4 font-bold text-slate-500">Active Deals in System</p>
                  </div>
                  
                  <div className={`p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group ${cardClass}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] -mr-10 -mt-10 rounded-full"></div>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Conversion Rate</p>
                        <i className="fas fa-chart-line text-emerald-500 opacity-80"></i>
                      </div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-emerald-500">{conversionRateVal}%</h2>
                      </div>
                    </div>
                    <p className="text-[10px] mt-4 font-bold text-slate-500">Deals Won ({wonCount})</p>
                  </div>
                  
                  <div className={`p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group ${cardClass}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] -mr-10 -mt-10 rounded-full"></div>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>In Negotiation</p>
                        <i className="fas fa-clock-rotate-left text-amber-500 opacity-80"></i>
                      </div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-amber-500">{negotiationRateVal}%</h2>
                      </div>
                    </div>
                    <p className="text-[10px] mt-4 font-bold text-slate-500">Pending Actions ({pendingCount})</p>
                  </div>
                  
                  <div className={`p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group ${cardClass}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] -mr-10 -mt-10 rounded-full"></div>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Loss Rate</p>
                        <i className="fas fa-arrow-trend-down text-rose-500 opacity-80"></i>
                      </div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-rose-500">{lossRateVal}%</h2>
                      </div>
                    </div>
                    <p className="text-[10px] mt-4 font-bold text-slate-500">Dropped Deals ({lostCount})</p>
                  </div>
                </div>

                {/* Volume Trajectory Chart */}
                <div className={`p-6 rounded-2xl ${cardClass}`}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Volume Trajectory</h3>
                    <span className="text-[9px] uppercase tracking-widest font-bold border border-cyan-500/30 text-cyan-400 px-3 py-1 rounded">Time-Series</span>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volumeTrajectoryData}>
                        <defs>
                          <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLightMode ? "#e2e8f0" : "#2a2d36"} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isLightMode ? '#64748b' : '#94a3b8', fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: isLightMode ? '#64748b' : '#94a3b8', fontSize: 10}} />
                        <RechartsTooltip contentStyle={{backgroundColor: isLightMode ? '#fff' : '#111318', borderColor: isLightMode ? '#e2e8f0' : '#333', borderRadius: '8px', color: isLightMode ? '#000' : '#fff'}} />
                        <Area type="monotone" dataKey="Volume" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-2xl ${cardClass}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Channel Allocation</h3>
                      <span className="text-[9px] uppercase tracking-widest font-bold border border-purple-500/30 text-purple-400 px-3 py-1 rounded">Type Distribution</span>
                    </div>
                    <div className="h-[250px] w-full flex items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={channelAllocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                            {channelAllocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{backgroundColor: isLightMode ? '#fff' : '#111318', borderColor: '#333', borderRadius: '8px'}} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-1/2 flex flex-col gap-3 justify-center pl-4 border-l border-white/5">
                        {channelAllocationData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }}></span>
                            <span className={`text-[10px] font-bold ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl ${cardClass}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Pipeline Distribution</h3>
                      <span className="text-[9px] uppercase tracking-widest font-bold border border-amber-500/30 text-amber-400 px-3 py-1 rounded">Deal Status</span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={pipelineDistributionData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isLightMode ? "#e2e8f0" : "#2a2d36"} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: isLightMode ? '#64748b' : '#94a3b8', fontSize: 9}} width={150} />
                          <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: isLightMode ? '#fff' : '#111318', borderColor: '#333', borderRadius: '8px'}} />
                          <Bar dataKey="Count" radius={[0, 4, 4, 0]} barSize={12}>
                            {pipelineDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={pieColors[(index + 2) % pieColors.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* ACTIVE DEAL REGISTRY */}
                <div className={`p-6 rounded-2xl flex flex-col ${cardClass}`}>
                  <div className="mb-4 flex justify-between items-end">
                    <div>
                      <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-1 ${isLightMode ? 'text-slate-500' : 'text-slate-300'}`}>Active Deal Registry</h3>
                      <p className="text-[10px] text-slate-500">Sorted by highest Volume top-down</p>
                    </div>
                    <button onClick={exportToCSV} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isLightMode ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' : 'bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400'}`}>
                      <i className="fas fa-file-csv"></i> <span className="hidden sm:inline">Export</span>
                    </button>
                  </div>
                  
                  {/* Table Specific Filters */}
                  <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl border border-white/5 bg-black/5 multi-select-container">
                    <div className="flex-1 min-w-[120px]">
                      <input type="text" placeholder="Search Code/Client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/5 text-white'}`} />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <select value={regClient} onChange={(e) => setRegClient(e.target.value)} className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/5 text-white'}`}>
                        <option value="All">All Clients</option>
                        {registryUniqueClients.map((c, i) => <option key={i} value={c as string}>{c as string}</option>)}
                      </select>
                    </div>
                    
                    {/* CUSTOM MULTI-SELECT FOR TYPE */}
                    <div className="relative flex-1 min-w-[120px]">
                      <div onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')} className={`cursor-pointer w-full px-3 py-2 rounded-lg text-xs outline-none border flex justify-between items-center ${isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e232e] border-white/5 text-white'}`}>
                        <span className="truncate">{regType.length === 0 ? "All Types" : `${regType.length} Selected`}</span>
                        <i className="fas fa-chevron-down text-[10px]"></i>
                      </div>
                      {openFilter === 'type' && (
                        <div className={`absolute top-full left-0 w-full mt-1 border rounded-lg shadow-xl z-50 p-2 max-h-48 overflow-y-auto ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/10'}`}>
                          {registryUniqueTypes.map(t => (
                            <label key={t as string} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${isLightMode ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-white/5'}`}>
                              <input type="checkbox" checked={regType.includes(t as string)} onChange={(e) => {
                                if(e.target.checked) setRegType([...regType, t as string]);
                                else setRegType(regType.filter(x => x !== t));
                              }} /> {t as string}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CUSTOM MULTI-SELECT FOR STATUS */}
                    <div className="relative flex-1 min-w-[120px]">
                      <div onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')} className={`cursor-pointer w-full px-3 py-2 rounded-lg text-xs outline-none border flex justify-between items-center ${isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1e232e] border-white/5 text-white'}`}>
                        <span className="truncate">{regStatus.length === 0 ? "All Statuses" : `${regStatus.length} Selected`}</span>
                        <i className="fas fa-chevron-down text-[10px]"></i>
                      </div>
                      {openFilter === 'status' && (
                        <div className={`absolute top-full left-0 w-full mt-1 border rounded-lg shadow-xl z-50 p-2 max-h-48 overflow-y-auto ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/10'}`}>
                          {registryUniqueStatuses.map(s => (
                            <label key={s as string} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${isLightMode ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-white/5'}`}>
                              <input type="checkbox" checked={regStatus.includes(s as string)} onChange={(e) => {
                                if(e.target.checked) setRegStatus([...regStatus, s as string]);
                                else setRegStatus(regStatus.filter(x => x !== s));
                              }} /> {s as string}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="Min Vol" value={regMinVol} onChange={(e) => setRegMinVol(e.target.value)} className={`w-20 px-3 py-2 rounded-lg text-xs outline-none border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/5 text-white'}`} />
                      <span className="text-slate-500">-</span>
                      <input type="number" placeholder="Max Vol" value={regMaxVol} onChange={(e) => setRegMaxVol(e.target.value)} className={`w-20 px-3 py-2 rounded-lg text-xs outline-none border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e232e] border-white/5 text-white'}`} />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className={`border-b ${isLightMode ? 'border-slate-300' : 'border-white/10'}`}>
                          <th className={`pb-4 font-bold uppercase tracking-wider text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Quote ID & Action</th>
                          <th className={`pb-4 font-bold uppercase tracking-wider text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Client Name</th>
                          <th className={`pb-4 font-bold uppercase tracking-wider text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Account Manager</th>
                          <th className={`pb-4 font-bold uppercase tracking-wider text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Status</th>
                          <th className={`pb-4 font-bold uppercase tracking-wider text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Type</th>
                          <th className={`pb-4 font-bold uppercase tracking-wider text-[9px] ${isLightMode ? 'text-slate-400' : 'text-slate-500'} text-right pr-4`}>Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTableData.map((row, index) => {
                          const parsedVol = getVolume(row);
                          const subjectData = encodeURIComponent(row['Email Subject Line'] || `Quote: ${row['Quote code']}`);
                          
                          return (
                            <tr key={index} className={`border-b last:border-0 ${isLightMode ? 'border-slate-200 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'} transition-colors group`}>
                              
                              <td className="py-4 font-mono text-xs flex items-center gap-3">
                                <span className={isLightMode ? 'text-slate-500' : 'text-slate-400'}>{row['Quote code']}</span>
                                
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a href={`mailto:?subject=${subjectData}`} className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all" title="Draft in Default Mail">
                                    <i className="fas fa-envelope text-[10px]"></i>
                                  </a>
                                  <a href={`https://mail.google.com/mail/u/0/#search/subject%3A"${subjectData}"`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded flex items-center justify-center bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all" title="Search in Gmail">
                                    <i className="fab fa-google text-[10px]"></i>
                                  </a>
                                  <button onClick={() => openEditModal(row)} className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all" title="Edit Deal">
                                    <i className="fas fa-pen text-[10px]"></i>
                                  </button>
                                </div>
                              </td>
                              
                              <td className={`py-4 font-bold text-xs ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>{row['Company/Client Name']}</td>
                              <td className={`py-4 text-xs ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{row['Account Manager']}</td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${String(row['Quote Status'] || '').toLowerCase().includes('won') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : String(row['Quote Status'] || '').toLowerCase().includes('lost') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`}>
                                  {row['Quote Status'] || 'Pending'}
                                </span>
                              </td>
                              <td className={`py-4 text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>{row['Type']}</td>
                              <td className="py-4 text-right pr-4 font-black text-emerald-500 text-sm tracking-wider">
                                {parsedVol.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {tableFilteredData.length > 0 && (
                    <div className={`mt-6 pt-4 border-t flex justify-between items-center text-xs ${isLightMode ? 'border-slate-200 text-slate-500' : 'border-white/5 text-slate-500'}`}>
                      <span>Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, tableFilteredData.length)} of {tableFilteredData.length} records</span>
                      <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 ${isLightMode ? 'bg-slate-200 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/20'}`}>Prev</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 ${isLightMode ? 'bg-slate-200 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/20'}`}>Next</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 2: SALES INTELLIGENCE ================= */}
            {activeTab === "sales" && (
              <div className="space-y-6 animate-fade-in w-full">
                <div className={`p-4 rounded-xl flex flex-wrap gap-4 z-10 relative border ${cardClass}`}>
                  <div className="flex-1 min-w-[150px]">
                    <label className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Filter By Month</label>
                    <select value={salesMonthFilter} onChange={(e) => setSalesMonthFilter(e.target.value)} className={`w-full rounded-lg px-3 py-2 text-xs outline-none transition-all ${isLightMode ? 'bg-white border border-slate-300' : 'bg-black/40 border border-white/10 text-white'}`}>
                      <option value="All">All Months</option>
                      {uniqueMonths.map((m, i) => <option key={i} value={m as string}>{m as string}</option>)}
                    </select>
                  </div>
                  {userRole === 'Admin' && (
                    <div className="flex-1 min-w-[150px]">
                      <label className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Account Manager</label>
                      <select value={salesAMFilter} onChange={(e) => setSalesAMFilter(e.target.value)} className={`w-full rounded-lg px-3 py-2 text-xs outline-none transition-all ${isLightMode ? 'bg-white border border-slate-300' : 'bg-black/40 border border-white/10 text-white'}`}>
                        <option value="All">All Managers</option>
                        {uniqueAMs.map((am, i) => <option key={i} value={am as string}>{am as string}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex-1 min-w-[150px]">
                    <label className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Source Type</label>
                    <select value={salesSourceFilter} onChange={(e) => setSalesSourceFilter(e.target.value)} className={`w-full rounded-lg px-3 py-2 text-xs outline-none transition-all ${isLightMode ? 'bg-white border border-slate-300' : 'bg-black/40 border border-white/10 text-white'}`}>
                      <option value="All">All Sources</option>
                      {uniqueSources.map((s, i) => <option key={i} value={s as string}>{s as string}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 block ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Center / Client</label>
                    <select value={salesCenterFilter} onChange={(e) => setSalesCenterFilter(e.target.value)} className={`w-full rounded-lg px-3 py-2 text-xs outline-none transition-all ${isLightMode ? 'bg-white border border-slate-300' : 'bg-black/40 border border-white/10 text-white'}`}>
                      <option value="All">All Centers</option>
                      {uniqueCenters.map((c, i) => <option key={i} value={c as string}>{c as string}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => { setSalesMonthFilter("All"); setSalesAMFilter("All"); setSalesSourceFilter("All"); setSalesCenterFilter("All"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all h-[34px] ${isLightMode ? 'bg-rose-100 hover:bg-rose-200 text-rose-600' : 'bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30'}`}>Clear Filters</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-[1.5rem] backdrop-blur-xl border transition-all ${cardClass}`}>
                    <div className="flex justify-between items-start">
                      <div><p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Filtered Packages Sold</p><h2 className="text-4xl font-black text-purple-500">{filteredRevenueData.length}</h2></div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLightMode ? 'bg-white shadow-sm' : 'bg-white/10'} text-purple-500`}><i className="fas fa-box-open text-xl"></i></div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-[1.5rem] backdrop-blur-xl border transition-all ${cardClass}`}>
                    <div className="flex justify-between items-start">
                      <div><p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Filtered Collected Revenue</p><h2 className="text-4xl font-black text-emerald-500">₹ {filteredRevenueData.reduce((sum, row) => sum + parseRevenue(row['prevenue']), 0).toLocaleString("en-IN")}</h2></div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLightMode ? 'bg-white shadow-sm' : 'bg-white/10'} text-emerald-500`}><i className="fas fa-sack-dollar text-xl"></i></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-[1.5rem] backdrop-blur-xl border ${cardClass}`}>
                    <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-6 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Revenue Trend (Monthly)</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLightMode ? "#e2e8f0" : "#333"} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isLightMode ? '#64748b' : '#94a3b8', fontSize: 12}} />
                          <RechartsTooltip cursor={{fill: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: isLightMode ? '#fff' : '#1e293b', borderRadius: '12px', border: 'none', color: isLightMode ? '#000' : '#fff'}} />
                          <Bar dataKey="Revenue" fill={isLightMode ? "#8b5cf6" : "#a855f7"} radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={`p-6 rounded-[1.5rem] backdrop-blur-xl border overflow-hidden ${cardClass}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Revenue Data Preview</h3>
                      <span className="text-[10px] text-sky-400 bg-sky-500/20 px-2 py-1 rounded border border-sky-500/30 font-bold">{filteredRevenueData.length} matches</span>
                    </div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className={`border-b ${isLightMode ? 'border-slate-300 text-slate-500' : 'border-white/10 text-slate-400'}`}>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Package Name</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Code</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">AM</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRevenueData.slice(0, 5).map((row, index) => (
                            <tr key={index} className={`border-b last:border-0 ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
                              <td className="py-4 font-medium truncate">{row['Packages Name']}</td>
                              <td className="py-4 font-mono text-xs">{row['Packages Code']}</td>
                              <td className="py-4 text-xs">{row['Sales Manager']}</td>
                              <td className={`py-4 font-bold ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`}>₹ {parseRevenue(row['prevenue']).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: EXECUTIVE OVERVIEW (ADMIN ONLY) ================= */}
            {activeTab === "executive" && userRole === 'Admin' && (
              <div className="space-y-6 animate-fade-in w-full">
                <div className={`p-8 rounded-[2rem] backdrop-blur-xl border mb-6 ${cardClass}`}>
                  <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h3 className="font-black tracking-widest uppercase text-lg">Follow-up Automation Center</h3>
                      <p className="text-xs text-slate-500 mt-1">Execute smart email follow-ups using live criteria</p>
                    </div>
                    {emailLoading && (
                      <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i> Processing Emails...
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'}`}>
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg mb-4"><i className="fas fa-calendar-minus"></i></div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Last Month's Pending Quotes</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">Scan all pipeline registries from the previous month. Automatically pull client contacts and send outstanding updates.</p>
                      </div>
                      <button onClick={() => handleEmailTrigger("last-month")} disabled={emailLoading} className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-widest transition-all">
                        <i className="fas fa-paper-plane mr-2"></i> Launch Last Month Blast
                      </button>
                    </div>
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'}`}>
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-lg mb-4"><i className="fas fa-clock-rotate-left"></i></div>
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-2">4-Day Age Follow-up</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">Identify quotes generated exactly 4 days ago that haven't shifted to a closed status. Instantly prompt client managers.</p>
                      </div>
                      <button onClick={() => handleEmailTrigger("4-days")} disabled={emailLoading} className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-widest transition-all">
                        <i className="fas fa-bolt mr-2"></i> Execute 4-Day Reminder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: USER MANAGEMENT (ADMIN ONLY) ================= */}
            {activeTab === "users" && userRole === 'Admin' && (
              <div className="space-y-6 animate-fade-in w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  <div className={`col-span-1 p-8 rounded-[2rem] backdrop-blur-xl border h-fit ${cardClass}`}>
                    <div className="mb-6">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl mb-4"><i className="fas fa-user-plus"></i></div>
                      <h3 className="font-black tracking-widest uppercase text-lg">Onboard Employee</h3>
                      <p className="text-xs text-slate-500 mt-1">Create secure access for Account Managers</p>
                    </div>
                    {userMessage.text && <div className={`p-3 mb-4 rounded-xl text-xs font-bold text-center border ${userMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>{userMessage.text}</div>}
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <input type="email" placeholder="Employee Email *" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required className={glassInputClass} />
                      <input type="password" placeholder="Set Initial Password *" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength={6} className={glassInputClass} />
                      <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} required className={glassInputClass}>
                        <option value="Manager" className="text-black">Account Manager</option>
                        <option value="Admin" className="text-black">System Admin</option>
                      </select>
                      <select value={newUserManager} onChange={(e) => setNewUserManager(e.target.value)} required className={glassInputClass}>
                        <option value="" disabled className="text-black">Map to Source Manager Name *</option>
                        {sourceAMsList.map((am, i) => <option key={i} value={am as string} className="text-black">{am as string}</option>)}
                      </select>
                      <button type="submit" disabled={formLoading} className="w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white mt-4 flex items-center justify-center gap-2">
                        {formLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-shield-check"></i>} {formLoading ? 'Configuring...' : 'Create Account'}
                      </button>
                    </form>
                  </div>

                  {/* Users Table */}
                  <div className={`col-span-1 lg:col-span-2 p-8 rounded-[2rem] backdrop-blur-xl border ${cardClass}`}>
                    <h3 className={`text-[11px] font-bold tracking-[0.2em] uppercase mb-6 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Personnel Directory</h3>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className={`border-b ${isLightMode ? 'border-slate-300 text-slate-500' : 'border-white/10 text-slate-400'}`}>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Email Address</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Role</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Mapped Name</th>
                            <th className="pb-3 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((u, i) => (
                            <tr key={i} className={`border-b last:border-0 ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
                              <td className="py-4 font-mono text-xs flex items-center gap-2">{u.email}{u.email === currentUserEmail && <span className="px-2 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-500 font-bold uppercase tracking-wider">You</span>}</td>
                              <td className="py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${u.role === 'Admin' ? 'bg-purple-500/20 text-purple-500 border-purple-500/30' : 'bg-sky-500/20 text-sky-500 border-sky-500/30'}`}>{u.role}</span></td>
                              <td className="py-4 font-medium text-xs">{u.manager_name}</td>
                              <td className="py-4 flex gap-2 justify-end">
                                <button onClick={() => { setEditingUserEmail(u.email); setEditingUserRole(u.role); setIsUserEditModalOpen(true); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLightMode ? 'bg-slate-200 hover:bg-slate-300' : 'bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/30 text-sky-400'}`}><i className="fas fa-user-pen"></i></button>
                                {u.email !== currentUserEmail && (
                                  <button onClick={() => { setDeletingUserEmail(u.email); setIsUserDeleteModalOpen(true); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLightMode ? 'bg-rose-100 hover:bg-rose-200 text-rose-600' : 'bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-400'}`}><i className="fas fa-user-xmark"></i></button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= ALL MODALS ================= */}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className={`w-full max-w-lg p-8 rounded-[2rem] backdrop-blur-2xl border transition-all ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`font-black tracking-widest uppercase text-xl ${isLightMode ? 'text-[#0f2e5a]' : 'text-white'}`}>Create New Lead</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>
            {message && <div className={`p-3 mb-4 rounded-xl text-sm font-bold text-center border ${message.includes('✅') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>{message}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <input list="client-options" placeholder="Client/Company Name *" value={clientName} onChange={handleClientNameChange} required className={`${glassInputClass} flex-1`} />
                <button type="button" onClick={() => setIsSourceModalOpen(true)} className={`px-4 rounded-xl font-bold transition-all flex items-center justify-center ${isLightMode ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/40'}`} title="Add New Client"><i className="fas fa-plus"></i></button>
              </div>
              <datalist id="client-options">{sourceClients.map((c, i) => <option key={i} value={c as string} />)}</datalist>
              {userRole === 'Admin' ? (
                <select value={accountManager} onChange={(e) => setAccountManager(e.target.value)} required className={glassInputClass}>
                  <option value="" disabled className="text-black">Select Account Manager *</option>
                  {sourceAMsList.map((am, i) => <option key={i} value={am as string} className="text-black">{am as string}</option>)}
                </select>
              ) : (
                <div className={`${glassInputClass} opacity-70 flex items-center`}><i className="fas fa-user-lock mr-2 text-slate-500"></i> Locked to: {userManagerName}</div>
              )}
              <select value={type} onChange={(e) => setType(e.target.value)} required className={glassInputClass}>
                <option value="" disabled className="text-black">Select Type *</option>
                {formUniqueTypes.map((t, i) => <option key={i} value={t as string} className="text-black">{t as string}</option>)}
              </select>
              <input type="text" placeholder="Email Subject Line" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className={glassInputClass} />
              <input type="text" placeholder="Requirement Details" value={requirement} onChange={(e) => setRequirement(e.target.value)} className={glassInputClass} />
              <input type="text" placeholder="Contact Person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={glassInputClass} />
              <button type="submit" disabled={formLoading} className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-white flex items-center justify-center gap-2 mt-2 ${isLightMode ? 'bg-[#0f2e5a] hover:bg-[#153e7a]' : 'bg-[#e3004f] hover:bg-[#ff0059]'}`}>
                {formLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>} {formLoading ? 'Saving...' : 'Deploy Lead'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (() => {
        const modalUniqueQuoteStatus = [...new Set(data.map(r => r['Quote Status']).filter(Boolean))];
        const modalUniqueDealStatus = [...new Set(data.map(r => r['Deal Status']).filter(Boolean))];
        const modalUniqueClientResponse = [...new Set(data.map(r => r['Client Response Status']).filter(Boolean))];

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <div className={`w-full max-w-lg p-8 rounded-[2rem] backdrop-blur-2xl border transition-all ${cardClass}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`font-black tracking-widest uppercase text-xl ${isLightMode ? 'text-[#0f2e5a]' : 'text-white'}`}>Update Lead <span className="text-emerald-500 text-sm ml-2">({editingCode})</span></h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>
              {editMessage && <div className={`p-3 mb-4 rounded-xl text-sm font-bold text-center border ${editMessage.includes('✅') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>{editMessage}</div>}
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Quote Status</label>
                  <select value={editQuoteStatus} onChange={(e) => setEditQuoteStatus(e.target.value)} className={`${glassInputClass} mt-1`}>
                    <option className="text-black" value="">Select Status</option>
                    {modalUniqueQuoteStatus.map((s, i) => <option key={i} value={s as string} className="text-black">{s as string}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Deal Status</label>
                  <select value={editDealStatus} onChange={(e) => setEditDealStatus(e.target.value)} className={`${glassInputClass} mt-1`}>
                    <option className="text-black" value="">Select Deal</option>
                    {modalUniqueDealStatus.map((s, i) => <option key={i} value={s as string} className="text-black">{s as string}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Client Response Status</label>
                  <select value={editClientResponse} onChange={(e) => setEditClientResponse(e.target.value)} className={`${glassInputClass} mt-1`}>
                    <option className="text-black" value="">Select Response</option>
                    {modalUniqueClientResponse.map((s, i) => <option key={i} value={s as string} className="text-black">{s as string}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Followup By (Auto-Logged)</label>
                  <div className={`${glassInputClass} mt-1 opacity-60 flex items-center bg-black/10`}>
                    <i className="fas fa-user-lock mr-2 text-slate-500"></i> {editFollowupBy}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Additional Remarks</label>
                  <input type="text" placeholder="Any comments..." value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} className={`${glassInputClass} mt-1`} />
                </div>
                <button type="submit" disabled={formLoading} className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-white flex items-center justify-center gap-3 mt-2 ${isLightMode ? 'bg-[#0f2e5a] hover:bg-[#153e7a]' : 'bg-[#e3004f] hover:bg-[#ff0059]'}`}>
                  {formLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-arrow-up"></i>} {formLoading ? 'Syncing...' : 'Update Database'}
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {isSourceModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className={`w-full max-w-lg p-8 rounded-[2rem] backdrop-blur-2xl border transition-all ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`font-black tracking-widest uppercase text-xl ${isLightMode ? 'text-[#0f2e5a]' : 'text-orange-500'}`}>Add Client Data</h2>
              <button onClick={() => setIsSourceModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>
            {sourceMessage && <div className={`p-3 mb-4 rounded-xl text-sm font-bold text-center border ${sourceMessage.includes('✅') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>{sourceMessage}</div>}
            <form onSubmit={handleSourceSubmit} className="space-y-4">
              <input type="text" placeholder="Company/Client Name *" value={srcClientName} onChange={(e) => setSrcClientName(e.target.value)} required className={glassInputClass} />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Contact Person *" value={srcContactPerson} onChange={(e) => setSrcContactPerson(e.target.value)} required className={glassInputClass} />
                <input type="text" placeholder="Contact Number" value={srcContactNumber} onChange={(e) => setSrcContactNumber(e.target.value)} className={glassInputClass} />
              </div>
              {userRole === 'Admin' ? (
                <input type="text" placeholder="Account Manager Name *" value={srcAM} onChange={(e) => setSrcAM(e.target.value)} required className={glassInputClass} />
              ) : (
                <div className={`${glassInputClass} opacity-70 flex items-center`}><i className="fas fa-user-lock mr-2 text-slate-500"></i> Locked to: {userManagerName}</div>
              )}
              <input type="email" placeholder="Primary Email ID *" value={srcEmail} onChange={(e) => setSrcEmail(e.target.value)} required className={glassInputClass} />
              <input type="email" placeholder="CC Email ID" value={srcCCEmail} onChange={(e) => setSrcCCEmail(e.target.value)} className={glassInputClass} />
              <button type="submit" disabled={formLoading} className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-white flex items-center justify-center gap-2 mt-2 ${isLightMode ? 'bg-[#0f2e5a] hover:bg-[#153e7a]' : 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]'}`}>
                {formLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-database"></i>} {formLoading ? 'Saving...' : 'Save & Auto-Fill'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isUserEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className={`w-full max-w-sm p-8 rounded-[2rem] backdrop-blur-2xl border transition-all ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`font-black tracking-widest uppercase text-lg ${isLightMode ? 'text-[#0f2e5a]' : 'text-white'}`}>Update Role</h2>
              <button onClick={() => setIsUserEditModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={handleUpdateUserRole} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Target Account</label>
                <div className={`${glassInputClass} mt-1 opacity-60 font-mono text-xs py-3`}>{editingUserEmail}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Access Level</label>
                <select value={editingUserRole} onChange={(e) => setEditingUserRole(e.target.value)} className={`${glassInputClass} mt-1`}>
                  <option value="Manager" className="text-black">Account Manager</option>
                  <option value="Admin" className="text-black">System Admin</option>
                </select>
              </div>
              <button type="submit" disabled={formLoading} className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-all text-white flex items-center justify-center gap-2 mt-4 ${isLightMode ? 'bg-[#0f2e5a] hover:bg-[#153e7a]' : 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_15px_rgba(2,132,199,0.4)]'}`}>
                {formLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-floppy-disk"></i>} {formLoading ? 'Syncing...' : 'Save Updates'}
              </button>
            </form>
          </div>
        </div>
      )}

      {(isDeleteModalOpen || isUserDeleteModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className={`w-full max-w-md p-8 rounded-[2rem] backdrop-blur-2xl border transition-all text-center ${cardClass}`}>
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 text-2xl"><i className={`fas ${isDeleteModalOpen ? 'fa-exclamation-triangle' : 'fa-user-slash'}`}></i></div>
            <h2 className={`font-black tracking-widest uppercase text-xl mb-2 ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{isDeleteModalOpen ? 'Delete Lead?' : 'Revoke Access?'}</h2>
            <p className={`text-sm mb-6 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Are you sure you want to permanently delete <strong className="text-rose-500">{isDeleteModalOpen ? deletingCode : deletingUserEmail}</strong>? This action cannot be undone.
            </p>
            {deleteMessage && <div className="p-3 mb-4 rounded-xl text-sm font-bold text-center bg-rose-500/20 text-rose-500 border border-rose-500/30">{deleteMessage}</div>}
            <div className="flex gap-4 justify-center">
              <button onClick={() => { setIsDeleteModalOpen(false); setIsUserDeleteModalOpen(false); }} className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${isLightMode ? 'bg-slate-200 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/20'}`}>Cancel</button>
              <button onClick={isDeleteModalOpen ? confirmDelete : confirmDeleteUser} disabled={formLoading} className="flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]">
                {formLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 10s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
        .animation-delay-2000 { animation-delay: 2s; }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}