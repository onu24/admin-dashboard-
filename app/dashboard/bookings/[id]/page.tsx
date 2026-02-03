"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface BookingData {
  serviceId: string;
  technicianId: string | null;
  status: "pending" | "assigned" | "completed" | "cancelled";
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: Timestamp;
  scheduledAt: Timestamp;
  notes?: string;
}

interface ServiceData {
  title?: string;
  name?: string;
  category?: string;
  price: number;
  duration: number;
}

interface TechnicianData {
  name: string;
  phone: string;
  email: string;
  skills: string[];
}

interface ActiveTechnician {
  id: string;
  name: string;
  skills: string[];
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-700",
      label: "Pending",
    },
    assigned: {
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      label: "Assigned",
    },
    completed: {
      bgColor: "bg-emerald-100",
      textColor: "text-emerald-700",
      label: "Completed",
    },
    cancelled: {
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      label: "Cancelled",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [service, setService] = useState<ServiceData | null>(null);
  const [technician, setTechnician] = useState<TechnicianData | null>(null);
  const [activeTechnicians, setActiveTechnicians] = useState<ActiveTechnician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setError(null);
        // Fetch booking document
        const bookingDoc = await getDoc(doc(db, "bookings", bookingId));

        if (!bookingDoc.exists()) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const bookingData = bookingDoc.data() as BookingData;
        setBooking(bookingData);

        // Fetch service document
        if (bookingData.serviceId) {
          const serviceDoc = await getDoc(doc(db, "services", bookingData.serviceId));
          if (serviceDoc.exists()) {
            setService(serviceDoc.data() as ServiceData);
          }
        }

        // Fetch technician document if assigned
        if (bookingData.technicianId) {
          const technicianDoc = await getDoc(
            doc(db, "technicians", bookingData.technicianId)
          );
          if (technicianDoc.exists()) {
            setTechnician(technicianDoc.data() as TechnicianData);
          }
        }

        // Fetch active technicians for assignment
        const activeTechniciansQuery = query(
          collection(db, "technicians"),
          where("active", "==", true)
        );
        const activeTechniciansSnapshot = await getDocs(activeTechniciansQuery);
        const techniciansList: ActiveTechnician[] = activeTechniciansSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            skills: data.skills || [],
          };
        });
        setActiveTechnicians(techniciansList);
      } catch (error) {
        console.error("Error fetching booking details:", error);
        setError("Failed to load booking details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const handleAssignClick = () => {
    if (!selectedTechnicianId || !booking || booking.technicianId || isAssigning) {
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleAssign = async () => {
    if (!selectedTechnicianId || !booking || booking.technicianId) {
      return;
    }

    try {
      setIsAssigning(true);
      setAssignmentMessage(null);
      setShowConfirmDialog(false);

      // Optimistically update UI
      const selectedTechnician = activeTechnicians.find((t) => t.id === selectedTechnicianId);
      setBooking({
        ...booking,
        technicianId: selectedTechnicianId,
        status: "assigned",
      });

      // Update Firestore
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        technicianId: selectedTechnicianId,
        status: "assigned",
      });

      // Fetch assigned technician details
      const technicianDoc = await getDoc(doc(db, "technicians", selectedTechnicianId));
      if (technicianDoc.exists()) {
        setTechnician(technicianDoc.data() as TechnicianData);
      }

      // Clear selection
      setSelectedTechnicianId("");
      setAssignmentMessage({
        type: "success",
        text: `Technician ${selectedTechnician?.name || ""} assigned successfully.`,
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setAssignmentMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error("Error assigning technician:", error);
      
      // Revert optimistic update on error
      if (booking) {
        setBooking({
          ...booking,
          technicianId: null,
          status: booking.status,
        });
      }
      setTechnician(null);

      // Provide more specific error message
      let errorMessage = "Failed to assign technician. Please try again.";
      if (error?.code === "permission-denied") {
        errorMessage = "Permission denied. Please check your access rights.";
      } else if (error?.code === "unavailable") {
        errorMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setAssignmentMessage({
        type: "error",
        text: errorMessage,
      });

      // Clear error message after 5 seconds
      setTimeout(() => {
        setAssignmentMessage(null);
      }, 5000);
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-semibold text-gray-900">Booking Details</h1>
          </div>
          <div className="space-y-6">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-semibold text-gray-900">Booking Details</h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-8">
            <div className="text-center">
              <p className="text-sm font-medium text-red-600 mb-1">
                {error || "Booking not found"}
              </p>
              <p className="text-xs text-gray-500">
                Please check the booking ID and try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scheduledDate = booking.scheduledAt?.toDate();
  const createdDate = booking.createdAt?.toDate();

  // Map booking status to timeline steps
  const getCurrentStep = () => {
    switch (booking.status) {
      case "completed":
        return 3; // Completed
      case "assigned":
        return 1; // Assigned
      case "pending":
        return 0; // Pending
      case "cancelled":
        return -1; // Cancelled (no step)
      default:
        return 0;
    }
  };

  const timelineSteps = [
    { label: "Pending", step: 0 },
    { label: "Assigned", step: 1 },
    { label: "On the way", step: 2 },
    { label: "Completed", step: 3 },
  ];

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-semibold text-gray-900">Booking Details</h1>
        </div>

        {/* Booking Info Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Booking Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking ID
              </label>
              <p className="text-sm font-mono text-gray-900 mt-1">{bookingId.substring(0, 8)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </label>
              <p className="mt-1">
                <StatusBadge status={booking.status} />
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled Date
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {scheduledDate
                  ? scheduledDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created Date
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {createdDate
                  ? createdDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Status Timeline</h2>
          <div className="relative">
            {/* Timeline Steps */}
            <div className="flex items-start">
              {timelineSteps.map((step, index) => {
                const isCompleted = currentStep > step.step;
                const isCurrent = currentStep === step.step;
                const isUpcoming = currentStep < step.step;

                return (
                  <div key={step.step} className="flex-1 flex items-start relative">
                    {/* Step Circle and Label Container */}
                    <div className="flex flex-col items-center w-full">
                      {/* Step Circle */}
                      <div className="relative z-10">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500"
                              : isCurrent
                              ? "bg-blue-600 border-blue-600"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {isCompleted ? (
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <div
                              className={`w-3 h-3 rounded-full ${
                                isCurrent ? "bg-white" : "bg-gray-300"
                              }`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Step Label */}
                      <div className="mt-3 text-center px-1">
                        <p
                          className={`text-xs font-medium ${
                            isCompleted || isCurrent
                              ? "text-gray-900"
                              : "text-gray-500"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    </div>

                    {/* Connecting Line */}
                    {index < timelineSteps.length - 1 && (
                      <div
                        className={`absolute top-5 h-0.5 ${
                          isCompleted ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                        style={{
                          left: "calc(50% + 20px)",
                          right: "calc(-50% + 20px)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </label>
              <p className="text-sm text-gray-900 mt-1">{booking.customerName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </label>
              <p className="text-sm text-gray-900 mt-1">{booking.customerPhone}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </label>
              <p className="text-sm text-gray-900 mt-1">{booking.customerAddress}</p>
            </div>
          </div>
        </div>

        {/* Service Info Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Service Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Name
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {service ? service.title || service.name || "—" : "—"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {service?.category || "—"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {service ? `₹${service.price.toLocaleString()}` : "—"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {service?.duration ? `${service.duration} min` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Assign Technician Section */}
        {!booking.technicianId && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Assign Technician</h2>
            <div className="space-y-5">
              {/* Success/Error Message */}
              {assignmentMessage && (
                <div
                  className={`flex items-start space-x-3 px-4 py-3 rounded-lg border ${
                    assignmentMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {assignmentMessage.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium leading-relaxed">{assignmentMessage.text}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="technician-select"
                  className="block text-sm font-medium text-gray-700 mb-2.5"
                >
                  Select Technician
                </label>
                <select
                  id="technician-select"
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  disabled={isAssigning}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  <option value="">Choose a technician...</option>
                  {activeTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} - {tech.skills.join(", ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end">
                <button
                  onClick={handleAssignClick}
                  disabled={!selectedTechnicianId || isAssigning}
                  className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => !isAssigning && setShowConfirmDialog(false)}
            ></div>
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirm Technician Assignment
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    Are you sure you want to assign{" "}
                    <span className="font-medium text-gray-900">
                      {activeTechnicians.find((t) => t.id === selectedTechnicianId)?.name || "this technician"}
                    </span>{" "}
                    to this booking? The booking status will be updated to "Assigned".
                  </p>
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDialog(false)}
                      disabled={isAssigning}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={isAssigning}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAssigning ? "Assigning..." : "Confirm Assign"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technician Info Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Technician Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </label>
              <p
                className={`text-sm mt-1 ${
                  technician ? "text-gray-900" : "text-gray-500 italic"
                }`}
              >
                {technician ? technician.name : "Unassigned"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {technician ? technician.phone : "—"}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skills
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {technician?.skills?.join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
