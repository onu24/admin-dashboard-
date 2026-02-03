"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Eye, Power, X, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Technician {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  active: boolean;
  verified: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    technician: Technician | null;
  }>({ isOpen: false, technician: null });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    skills: "",
    verified: false,
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, type === "success" ? 3000 : 5000);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      name: "",
      phone: "",
      skills: "",
      verified: false,
    });
  };

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const techniciansSnapshot = await getDocs(collection(db, "technicians"));
      const techniciansData: Technician[] = techniciansSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          phone: data.phone || "",
          skills: Array.isArray(data.skills) ? data.skills : [],
          active: data.active !== undefined ? data.active : true,
          verified: data.verified !== undefined ? data.verified : false,
        };
      });

      setTechnicians(techniciansData);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      setFetchError("Unable to load technicians. Please try again later.");
      showToast("Failed to load technicians.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
    setFormData({
      name: "",
      phone: "",
      skills: "",
      verified: false,
    });
  };

  const handleViewTechnician = (technician: Technician) => {
    setSelectedTechnician(technician);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedTechnician(null);
  };

  const handleToggleStatusClick = (technician: Technician) => {
    if (technician.active) {
      // Show confirmation for deactivating
      setConfirmDialog({ isOpen: true, technician });
    } else {
      // Activate directly without confirmation
      handleToggleStatus(technician);
    }
  };

  const handleToggleStatus = async (technician: Technician) => {
    try {
      const technicianRef = doc(db, "technicians", technician.id);
      const newStatus = !technician.active;

      // Optimistically update UI
      setTechnicians((prevTechnicians) =>
        prevTechnicians.map((t) =>
          t.id === technician.id ? { ...t, active: newStatus } : t
        )
      );

      // Update Firestore
      await updateDoc(technicianRef, {
        active: newStatus,
      });

      // Show success toast
      showToast(
        `Technician ${newStatus ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling technician status:", error);
      // Revert optimistic update on error
      await fetchTechnicians();
      showToast("Failed to update technician status", "error");
    } finally {
      setConfirmDialog({ isOpen: false, technician: null });
    }
  };

  const handleToggleVerified = async (technician: Technician) => {
    try {
      const technicianRef = doc(db, "technicians", technician.id);
      const newVerifiedStatus = !technician.verified;

      // Optimistically update UI
      setTechnicians((prevTechnicians) =>
        prevTechnicians.map((t) =>
          t.id === technician.id ? { ...t, verified: newVerifiedStatus } : t
        )
      );

      // Update Firestore
      await updateDoc(technicianRef, {
        verified: newVerifiedStatus,
      });

      // Show success toast
      showToast(
        `Technician ${newVerifiedStatus ? "verified" : "unverified"} successfully`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling technician verified status:", error);
      // Revert optimistic update on error
      await fetchTechnicians();
      showToast("Failed to update verification status", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone is required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert skills string to array (split by comma and trim each)
      const skillsArray = formData.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      // Create technician document
      const technicianData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        skills: skillsArray,
        active: true, // Default to true
        verified: formData.verified, // Use checkbox value
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "technicians"), technicianData);

      // Close modal and refresh list
      handleCloseModal();
      await fetchTechnicians();
      showToast("Technician added successfully", "success");
    } catch (error) {
      console.error("Error creating technician:", error);
      setError("Failed to create technician. Please try again.");
      showToast("Failed to add technician", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Technicians</h1>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-150"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Technician
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Verified
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12">
                      <div className="space-y-3">
                        {[...Array(5)].map((_, index) => (
                          <div key={index} className="animate-pulse">
                            <div className="h-12 bg-gray-200 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12">
                      <div className="text-center">
                        <p className="text-sm font-medium text-red-600 mb-1">
                          {fetchError}
                        </p>
                        <p className="text-xs text-gray-500">
                          Please check your connection and try refreshing the page.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : technicians.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        No technicians found
                      </p>
                      <p className="text-xs text-gray-400">
                        Get started by adding your first technician
                      </p>
                    </td>
                  </tr>
                ) : (
                  technicians.map((technician) => (
                    <tr
                      key={technician.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {technician.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {technician.phone || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-gray-600">
                          {technician.skills?.join(", ") || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            technician.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {technician.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleVerified(technician)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-150 hover:opacity-80 ${
                            technician.verified
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                          title={technician.verified ? "Click to unverify" : "Click to verify"}
                        >
                          {technician.verified ? "Yes" : "No"}
                        </button>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2.5">
                          <button
                            onClick={() => handleViewTechnician(technician)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                            title="View technician"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View
                          </button>
                          <button
                            onClick={() => handleToggleStatusClick(technician)}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 ${
                              technician.active
                                ? "text-red-700 bg-white border border-red-300 hover:bg-red-50"
                                : "text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50"
                            }`}
                            title={technician.active ? "Deactivate technician" : "Activate technician"}
                          >
                            <Power className={`w-3.5 h-3.5 mr-1.5 ${technician.active ? "" : "rotate-180"}`} />
                            {technician.active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Technician Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseModal}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add New Technician
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Name Field */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Phone Field */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Phone
                  </label>
                  <input
                    type="text"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., +91 98765 12345"
                  />
                </div>

                {/* Skills Field */}
                <div>
                  <label
                    htmlFor="skills"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    id="skills"
                    value={formData.skills}
                    onChange={(e) =>
                      setFormData({ ...formData, skills: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Electrician, AC Repair"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate multiple skills with commas
                  </p>
                </div>

                {/* Verified Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={formData.verified}
                    onChange={(e) =>
                      setFormData({ ...formData, verified: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="verified"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Verified
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Technician Modal */}
      {isViewModalOpen && selectedTechnician && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseViewModal}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Technician Details
                </h2>
                <button
                  onClick={handleCloseViewModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">
                    Name
                  </label>
                  <p className="text-sm text-gray-900">{selectedTechnician.name}</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">
                    Phone
                  </label>
                  <p className="text-sm text-gray-900">{selectedTechnician.phone}</p>
                </div>

                {/* Skills */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">
                    Skills
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedTechnician.skills && selectedTechnician.skills.length > 0
                      ? selectedTechnician.skills.join(", ")
                      : "—"}
                  </p>
                </div>

                {/* Active Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedTechnician.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selectedTechnician.active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Verified Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">
                    Verified
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedTechnician.verified
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selectedTechnician.verified ? "Yes" : "No"}
                  </span>
                </div>

                {/* Close Button */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseViewModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && confirmDialog.technician && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setConfirmDialog({ isOpen: false, technician: null })}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md">
              <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirm Deactivate Technician
                </h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Are you sure you want to deactivate "
                  <span className="font-medium">{confirmDialog.technician.name}</span>"?
                  This will make them unavailable for new bookings.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog({ isOpen: false, technician: null })}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDialog.technician) {
                        handleToggleStatus(confirmDialog.technician);
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-150"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800"
                : "bg-white border-red-200 text-red-800"
            } animate-in slide-in-from-right`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
            {toast.type === "error" && (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
