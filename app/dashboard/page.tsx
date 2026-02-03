"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Clock, Users, Wrench } from "lucide-react";

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  totalTechnicians: number;
  totalServices: number;
}

interface Booking {
  id: string;
  serviceId: string;
  technicianId: string | null;
  status: "pending" | "assigned" | "completed" | "cancelled";
  scheduledAt: Timestamp;
  serviceName?: string;
  technicianName?: string;
}

interface StatusBadgeProps {
  status: "pending" | "assigned" | "completed" | "cancelled";
}

function StatusBadge({ status }: StatusBadgeProps) {
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

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}

interface Service {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    totalTechnicians: 0,
    totalServices: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsError(null);
        // Fetch total bookings
        const bookingsSnapshot = await getDocs(collection(db, "bookings"));
        const totalBookings = bookingsSnapshot.size;

        // Fetch pending bookings
        const pendingQuery = query(
          collection(db, "bookings"),
          where("status", "==", "pending")
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        const pendingBookings = pendingSnapshot.size;

        // Fetch total technicians
        const techniciansSnapshot = await getDocs(collection(db, "technicians"));
        const totalTechnicians = techniciansSnapshot.size;

        // Fetch total services
        const servicesSnapshot = await getDocs(collection(db, "services"));
        const totalServices = servicesSnapshot.size;

        setStats({
          totalBookings,
          pendingBookings,
          totalTechnicians,
          totalServices,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStatsError("Unable to load dashboard statistics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        setBookingsError(null);
        // Fetch services and technicians for name resolution
        const [servicesSnapshot, techniciansSnapshot, bookingsSnapshot] = await Promise.all([
          getDocs(collection(db, "services")),
          getDocs(collection(db, "technicians")),
          getDocs(query(collection(db, "bookings"), orderBy("scheduledAt", "desc"), limit(6))),
        ]);

        // Create lookup maps
        const servicesMap = new Map<string, string>();
        servicesSnapshot.forEach((doc) => {
          servicesMap.set(doc.id, doc.data().name);
        });

        const techniciansMap = new Map<string, string>();
        techniciansSnapshot.forEach((doc) => {
          techniciansMap.set(doc.id, doc.data().name);
        });

        // Process bookings with resolved names
        const bookings: Booking[] = bookingsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id, // Full ID for key, will display short version
            serviceId: data.serviceId,
            technicianId: data.technicianId || null,
            status: data.status,
            scheduledAt: data.scheduledAt,
            serviceName: servicesMap.get(data.serviceId) || "Unknown Service",
            technicianName: data.technicianId
              ? techniciansMap.get(data.technicianId) || "Unknown Technician"
              : "Unassigned",
          };
        });

        setRecentBookings(bookings);
      } catch (error) {
        console.error("Error fetching recent bookings:", error);
        setBookingsError("Unable to load recent bookings. Please try again later.");
      } finally {
        setBookingsLoading(false);
      }
    };

    fetchRecentBookings();
  }, []);

  const statCards = [
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-100",
      trend: "+12% today",
      trendPositive: true,
    },
    {
      title: "Pending Bookings",
      value: stats.pendingBookings,
      icon: Clock,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-100",
      trend: "+5% today",
      trendPositive: true,
    },
    {
      title: "Total Technicians",
      value: stats.totalTechnicians,
      icon: Users,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-100",
      trend: "No change",
      trendPositive: false,
    },
    {
      title: "Total Services",
      value: stats.totalServices,
      icon: Wrench,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-100",
      trend: "No change",
      trendPositive: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">Dashboard</h1>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm border ${card.borderColor} p-6 animate-pulse`}
              >
                <div className={`h-10 w-10 rounded-lg ${card.bgColor} mb-4`}></div>
                <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                <div className="h-9 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : statsError ? (
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-8">
            <div className="text-center">
              <p className="text-sm font-medium text-red-600 mb-1">
                {statsError}
              </p>
              <p className="text-xs text-gray-500">
                Please check your connection and try refreshing the page.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl shadow-sm border ${card.borderColor} p-6 hover:shadow-md hover:scale-[1.02] transition-all duration-200 group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-lg ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1.5">
                    {card.title}
                  </h3>
                  <p className="text-3xl font-semibold text-gray-900 tracking-tight mb-1">
                    {card.value}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      card.trendPositive
                        ? "text-emerald-600"
                        : "text-gray-500"
                    }`}
                  >
                    {card.trend}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Bookings Table */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Bookings</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {bookingsLoading ? (
              <div className="p-8">
                <div className="space-y-3">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : bookingsError ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-red-600 mb-1">
                  {bookingsError}
                </p>
                <p className="text-xs text-gray-500">
                  Please check your connection and try refreshing the page.
                </p>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  No bookings found
                </p>
                <p className="text-xs text-gray-400">
                  Bookings will appear here once they are created
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Booking ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Technician
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Scheduled Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {recentBookings.map((booking) => {
                      const scheduledDate = booking.scheduledAt?.toDate();
                      const formattedDate = scheduledDate
                        ? scheduledDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A";

                      return (
                        <tr
                          key={booking.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono text-gray-900">
                              {booking.id.substring(0, 8)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {booking.serviceName}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`text-sm ${
                                booking.technicianName === "Unassigned"
                                  ? "text-gray-500 italic"
                                  : "text-gray-900"
                              }`}
                            >
                              {booking.technicianName}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={booking.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{formattedDate}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
