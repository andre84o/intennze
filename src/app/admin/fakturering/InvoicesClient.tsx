"use client";

import { useState } from "react";
import {
  Invoice,
  InvoiceStatus,
  invoiceStatusLabels,
  invoiceStatusColors,
  Customer,
} from "@/types/database";
import { createClient } from "@/utils/supabase/client";

interface Props {
  initialInvoices: (Invoice & { customer: Customer })[];
  customersWithService: Customer[];
  error?: string;
}

const VAT_RATE = 25;

export default function InvoicesClient({
  initialInvoices,
  customersWithService,
  error,
}: Props) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & { customer: Customer }) | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE");
  };

  const getMonthName = (dateString: string) => {
    const [year, month] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  };

  // Filter invoices
  const filteredInvoices =
    statusFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter);

  // Check if invoice already exists for a customer in a given month
  const hasInvoiceForMonth = (customerId: string, month: string) => {
    const [year, monthNum] = month.split("-");
    return invoices.some((inv) => {
      const invDate = new Date(inv.period_start);
      return (
        inv.customer_id === customerId &&
        invDate.getFullYear() === parseInt(year) &&
        invDate.getMonth() + 1 === parseInt(monthNum)
      );
    });
  };

  // Get customers that don't have invoices for selected month
  const customersNeedingInvoice = customersWithService.filter(
    (c) => !hasInvoiceForMonth(c.id, selectedMonth)
  );

  // Generate invoices for all customers with service agreements
  const handleGenerateInvoices = async () => {
    if (customersNeedingInvoice.length === 0) return;

    setGenerating(true);
    const supabase = createClient();

    const [year, month] = selectedMonth.split("-");
    const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    const periodEnd = new Date(parseInt(year), parseInt(month), 0);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment term

    const newInvoices: Omit<Invoice, "id" | "created_at" | "updated_at" | "invoice_number">[] = [];

    for (const customer of customersNeedingInvoice) {
      if (!customer.service_price) continue;

      const amount = customer.service_price;
      const vatAmount = Math.round(amount * (VAT_RATE / 100));
      const total = amount + vatAmount;

      newInvoices.push({
        customer_id: customer.id,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        amount,
        vat_rate: VAT_RATE,
        vat_amount: vatAmount,
        total,
        description: `Serviceavtal ${customer.service_type || "Webbhotell"} - ${getMonthName(selectedMonth)}`,
        status: "pending",
        sent_at: null,
        paid_at: null,
        service_type: customer.service_type,
        created_by: null,
      });
    }

    const { data, error } = await supabase
      .from("invoices")
      .insert(newInvoices)
      .select("*, customer:customers(*)");

    if (!error && data) {
      setInvoices((prev) => [...data, ...prev]);
    }

    setGenerating(false);
    setShowGenerateModal(false);
  };

  // Update invoice status
  const handleUpdateStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    const supabase = createClient();

    const updates: Partial<Invoice> = { status: newStatus };
    if (newStatus === "sent") {
      updates.sent_at = new Date().toISOString();
    } else if (newStatus === "paid") {
      updates.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", invoiceId);

    if (!error) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, ...updates } : inv
        )
      );
    }
  };

  // Download PDF
  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: number) => {
    setDownloadingPdf(true);
    try {
      const response = await fetch("/api/invoice/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      if (!response.ok) {
        throw new Error("Kunde inte generera PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faktura-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Kunde inte ladda ner PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Send invoice via email
  const handleSendInvoice = async (invoiceId: string) => {
    if (!selectedInvoice?.customer?.email) {
      alert("Kunden har ingen e-postadress");
      return;
    }

    setSendingInvoice(true);
    try {
      const response = await fetch("/api/invoice/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Kunde inte skicka fakturan");
      }

      // Update local state
      const now = new Date().toISOString();
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: "sent" as InvoiceStatus, sent_at: now } : inv
        )
      );

      if (selectedInvoice) {
        setSelectedInvoice({ ...selectedInvoice, status: "sent", sent_at: now });
      }

      alert("Fakturan har skickats!");
    } catch (err) {
      console.error("Send invoice error:", err);
      alert(err instanceof Error ? err.message : "Kunde inte skicka fakturan");
    } finally {
      setSendingInvoice(false);
    }
  };

  // Stats
  const pendingCount = invoices.filter((i) => i.status === "pending").length;
  const pendingTotal = invoices
    .filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + i.total, 0);
  const sentCount = invoices.filter((i) => i.status === "sent").length;
  const sentTotal = invoices
    .filter((i) => i.status === "sent")
    .reduce((sum, i) => sum + i.total, 0);
  const paidThisMonth = invoices
    .filter((i) => {
      if (i.status !== "paid" || !i.paid_at) return false;
      const paidDate = new Date(i.paid_at);
      const now = new Date();
      return (
        paidDate.getMonth() === now.getMonth() &&
        paidDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fakturering</h1>
          <p className="text-gray-500 mt-1">
            Hantera månadsfakturor för serviceavtal
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-300 shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Generera fakturor
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
          <p className="text-amber-600 text-sm font-medium">Att skicka</p>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-sm text-amber-600">{formatCurrency(pendingTotal)}</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
          <p className="text-blue-600 text-sm font-medium">Skickade</p>
          <p className="text-2xl font-bold text-blue-700">{sentCount}</p>
          <p className="text-sm text-blue-600">{formatCurrency(sentTotal)}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
          <p className="text-green-600 text-sm font-medium">Betalt denna månad</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(paidThisMonth)}</p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
          <p className="text-purple-600 text-sm font-medium">Aktiva serviceavtal</p>
          <p className="text-2xl font-bold text-purple-700">{customersWithService.length}</p>
          <p className="text-sm text-purple-600">
            {formatCurrency(customersWithService.reduce((sum, c) => sum + (c.service_price || 0), 0))}/mån
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            statusFilter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Alla ({invoices.length})
        </button>
        {(["pending", "sent", "paid", "overdue"] as InvoiceStatus[]).map((status) => {
          const count = invoices.filter((i) => i.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {invoiceStatusLabels[status]} ({count})
            </button>
          );
        })}
      </div>

      {/* Invoices table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {invoices.length === 0
              ? "Inga fakturor ännu. Generera fakturor för att komma igång!"
              : "Inga fakturor matchar filtret."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Faktura #
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Kund
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">
                    Period
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">
                    Belopp
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden lg:table-cell">
                    Förfallodatum
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium">
                        #{invoice.invoice_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {invoice.customer?.first_name} {invoice.customer?.last_name}
                        </p>
                        {invoice.customer?.company_name && (
                          <p className="text-sm text-gray-500">
                            {invoice.customer.company_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {getMonthName(invoice.period_start)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(invoice.amount)} + moms
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          invoiceStatusColors[invoice.status]
                        }`}
                      >
                        {invoiceStatusLabels[invoice.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status === "pending" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(invoice.id, "sent");
                            }}
                            className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Markera skickad
                          </button>
                        )}
                        {invoice.status === "sent" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(invoice.id, "paid");
                            }}
                            className="px-3 py-1 text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            Markera betald
                          </button>
                        )}
                        {(invoice.status === "pending" || invoice.status === "sent") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(invoice.id, "cancelled");
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                            title="Makulera"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setShowGenerateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Generera månadsfakturor
              </h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Välj månad
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Kunder med serviceavtal ({customersNeedingInvoice.length} att fakturera)
                </p>
                {customersNeedingInvoice.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Alla kunder har redan fakturor för {getMonthName(selectedMonth)}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customersNeedingInvoice.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer.service_type || "Serviceavtal"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(customer.service_price || 0)}
                          </p>
                          <p className="text-xs text-gray-500">
                            + {formatCurrency(Math.round((customer.service_price || 0) * 0.25))} moms
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {customersNeedingInvoice.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">
                      Totalt att fakturera:
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatCurrency(
                        customersNeedingInvoice.reduce(
                          (sum, c) =>
                            sum + (c.service_price || 0) * 1.25,
                          0
                        )
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Inkl. 25% moms
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Avbryt
              </button>
              <button
                onClick={handleGenerateInvoices}
                disabled={generating || customersNeedingInvoice.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Genererar...
                  </>
                ) : (
                  <>
                    Generera {customersNeedingInvoice.length} fakturor
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setSelectedInvoice(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Faktura #{selectedInvoice.invoice_number}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    invoiceStatusColors[selectedInvoice.status]
                  }`}
                >
                  {invoiceStatusLabels[selectedInvoice.status]}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Fakturadatum
                  </h3>
                  <p className="text-gray-900 font-medium">
                    {formatDate(selectedInvoice.invoice_date)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Förfallodatum
                  </h3>
                  <p className="text-gray-900 font-medium">
                    {formatDate(selectedInvoice.due_date)}
                  </p>
                </div>
              </div>

              {/* Period */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Faktureringsperiod
                </h3>
                <p className="text-gray-900 font-medium">
                  {getMonthName(selectedInvoice.period_start)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedInvoice.period_start)} – {formatDate(selectedInvoice.period_end)}
                </p>
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                  Kund
                </h3>
                <div className="space-y-1">
                  <p className="text-gray-900 font-semibold">
                    {selectedInvoice.customer?.first_name} {selectedInvoice.customer?.last_name}
                  </p>
                  {selectedInvoice.customer?.company_name && (
                    <p className="text-gray-700">{selectedInvoice.customer.company_name}</p>
                  )}
                  {selectedInvoice.customer?.org_number && (
                    <p className="text-sm text-gray-500">Org.nr: {selectedInvoice.customer.org_number}</p>
                  )}
                  {selectedInvoice.customer?.address && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedInvoice.customer.address}
                      {selectedInvoice.customer.postal_code && `, ${selectedInvoice.customer.postal_code}`}
                      {selectedInvoice.customer.city && ` ${selectedInvoice.customer.city}`}
                    </p>
                  )}
                  {selectedInvoice.customer?.email && (
                    <p className="text-sm text-gray-500">{selectedInvoice.customer.email}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedInvoice.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Beskrivning
                  </h3>
                  <p className="text-gray-700">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Amount breakdown */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Belopp
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Belopp exkl. moms</span>
                    <span>{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Moms ({selectedInvoice.vat_rate}%)</span>
                    <span>{formatCurrency(selectedInvoice.vat_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Totalt att betala</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Status history */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Historik
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Skapad: {formatDate(selectedInvoice.created_at)}</span>
                  </div>
                  {selectedInvoice.sent_at && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      <span>Skickad: {formatDate(selectedInvoice.sent_at)}</span>
                    </div>
                  )}
                  {selectedInvoice.paid_at && (
                    <div className="flex items-center gap-2 text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Betald: {formatDate(selectedInvoice.paid_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Stäng
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                  disabled={downloadingPdf}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                  Ladda ner PDF
                </button>
              </div>
              <div className="flex gap-2">
                {selectedInvoice.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleSendInvoice(selectedInvoice.id)}
                      disabled={sendingInvoice || !selectedInvoice.customer?.email}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!selectedInvoice.customer?.email ? "Kunden har ingen e-postadress" : ""}
                    >
                      {sendingInvoice ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Skickar...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Skicka via e-post
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedInvoice.id, "sent");
                        setSelectedInvoice({ ...selectedInvoice, status: "sent", sent_at: new Date().toISOString() });
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Markera skickad
                    </button>
                  </>
                )}
                {selectedInvoice.status === "sent" && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedInvoice.id, "paid");
                      setSelectedInvoice({ ...selectedInvoice, status: "paid", paid_at: new Date().toISOString() });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Markera betald
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
