"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, X, Power, CheckCircle2 } from "lucide-react";

interface Service {
  id: string;
  title: string;
  category?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({ isOpen: false, service: null });
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    duration: "",
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const servicesSnapshot = await getDocs(collection(db, "services"));
      const servicesData: Service[] = servicesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || "",
          category: data.category || "",
          price: typeof data.price === "number" ? data.price : 0,
          duration: typeof data.duration === "number" ? data.duration : 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
        };
      });

      setServices(servicesData);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleEdit = (service: Service) => {
    setEditingServiceId(service.id);
    setFormData({
      title: service.title,
      category: service.category || "",
      price: service.price.toString(),
      duration: service.duration.toString(),
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingServiceId(null);
    setError(null);
    setFormData({
      title: "",
      category: "",
      price: "",
      duration: "",
    });
  };

  const handleToggleStatusClick = (service: Service) => {
    if (service.isActive) {
      // Show confirmation for disabling
      setConfirmDialog({ isOpen: true, service });
    } else {
      // Enable directly without confirmation
      handleToggleStatus(service);
    }
  };

  const handleToggleStatus = async (service: Service) => {
    try {
      const serviceRef = doc(db, "services", service.id);
      const newStatus = !service.isActive;

      // Optimistically update UI
      setServices((prevServices) =>
        prevServices.map((s) =>
          s.id === service.id ? { ...s, isActive: newStatus } : s
        )
      );

      // Update Firestore
      await updateDoc(serviceRef, {
        isActive: newStatus,
      });

      // Show toast
      showToast(
        `Service ${newStatus ? "enabled" : "disabled"} successfully`,
        "success"
      );
    } catch (error) {
      console.error("Error toggling service status:", error);
      // Revert optimistic update on error
      await fetchServices();
      showToast("Failed to update service status", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.title.trim()) {
      setError("Service title is required");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      setError("Duration must be greater than 0");
      return;
    }

    try {
      setIsSubmitting(true);

      const serviceData = {
        title: formData.title.trim(),
        category: formData.category.trim() || "",
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
      };

      if (editingServiceId) {
        // Update existing service
        const serviceRef = doc(db, "services", editingServiceId);
        
        // Optimistically update UI
        setServices((prevServices) =>
          prevServices.map((service) =>
            service.id === editingServiceId
              ? {
                  ...service,
                  ...serviceData,
                }
              : service
          )
        );

        await updateDoc(serviceRef, serviceData);
        showToast("Service updated successfully", "success");
      } else {
        // Create new service
        await addDoc(collection(db, "services"), {
          ...serviceData,
          isActive: true,
          createdAt: Timestamp.now(),
        });

        // Refresh services list for new service
        await fetchServices();
        showToast("Service added successfully", "success");
      }

      // Reset form and close modal
      handleCloseModal();
    } catch (error) {
      console.error("Error saving service:", error);
      setError(
        editingServiceId
          ? "Failed to update service. Please try again."
          : "Failed to create service. Please try again."
      );
      
      // Revert optimistic update on error
      if (editingServiceId) {
        await fetchServices();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Services</h1>
          <button
            onClick={() => {
              setEditingServiceId(null);
              setFormData({
                title: "",
                category: "",
                price: "",
                duration: "",
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-150"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
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
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        No services found
                      </p>
                      <p className="text-xs text-gray-400">
                        Get started by adding your first service
                      </p>
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr
                      key={service.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {service.title}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {service.category || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          ₹{service.price.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {service.duration ? `${service.duration} min` : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            service.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2.5">
                          <button
                            onClick={() => handleEdit(service)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                            title="Edit service"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatusClick(service)}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 ${
                              service.isActive
                                ? "text-red-700 bg-white border border-red-300 hover:bg-red-50"
                                : "text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50"
                            }`}
                            title={service.isActive ? "Disable service" : "Enable service"}
                          >
                            <Power className={`w-3.5 h-3.5 mr-1.5 ${service.isActive ? "" : "rotate-180"}`} />
                            {service.isActive ? "Disable" : "Enable"}
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

      {/* Add Service Modal */}
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
                  {editingServiceId ? "Edit Service" : "Add New Service"}
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
                {/* Service Title */}
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Service Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Electrician"
                  />
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Category
                  </label>
                  <input
                    type="text"
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Electrical"
                  />
                </div>

                {/* Price */}
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    id="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="120"
                  />
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

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && confirmDialog.service && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setConfirmDialog({ isOpen: false, service: null })}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Disable Service
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to disable "{confirmDialog.service.title}"? This service will no longer be available for bookings.
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setConfirmDialog({ isOpen: false, service: null })}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDialog.service) {
                        handleToggleStatus(confirmDialog.service);
                        setConfirmDialog({ isOpen: false, service: null });
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-150"
                  >
                    Disable
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
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
