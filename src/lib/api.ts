import { useAuthStore } from "@/store/auth.store";
import axios from "axios";
import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
      refresh_token: refreshToken,
    });
    useAuthStore.getState().setAuth(
      useAuthStore.getState().user!,
      data.access_token,
      data.refresh_token,
    );
    return data.access_token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url: string = original?.url ?? "";
    const status: number = error.response?.status;

    const isAuthEndpoint = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
    ].some((path) => url.includes(path));

    if (status === 401 && !isAuthEndpoint && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }

    if (!isAuthEndpoint && status !== 401 && !original?.skipErrorToast) {
      const msg = error.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      if (text) toast.error(text);
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  login: (data: any) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  profile: () => api.get("/auth/profile"),
  verifyEmail: (payload: { email: string; code: string }) =>
    api.post('/auth/verify-email', payload),
  resendCode: (payload: { email: string }) =>
    api.post('/auth/resend-code', payload),
  forgotPassword: (payload: { email: string }) =>
    api.post('/auth/forgot-password', payload),
  verifyResetCode: (payload: { email: string; code: string }) =>
    api.post('/auth/verify-reset-code', payload),
  resetPassword: (payload: { email: string; code: string; new_password: string }) =>
    api.post('/auth/reset-password', payload),
};

export const profileApi = {
  getMe: () => api.get("/users/me/profile"),
  markHandbookSeen: () => api.patch("/users/me/handbook-seen"),
  updateMe: (data: any) => api.put("/users/me/profile", data),
  updatePassword: (data: any) => api.patch("/users/me/password", data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.patch("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const sessionsApi = {
  list: (params?: any) => api.get("/sessions", { params }),
  get: (id: string) => api.get(`/sessions/${id}`),
  getAllCosts: (params?: { month?: number; year?: number }) =>
    api.get("/sessions/costs/summary", { params }),
  getCostDetail: (id: string) => api.get(`/sessions/${id}/cost-detail`),
  getParticipants: (id: string) => api.get(`/sessions/${id}/participants`),
};

export const registrationsApi = {
  register: (data: { session_id: string; notes?: string }) =>
    api.post("/registrations", data),
  getMyRegistrations: (params?: any) =>
    api.get("/registrations/my", { params }),
  listBySession: (sessionId: string, params?: any) =>
    api.get(`/registrations/session/${sessionId}`, { params }),
  submitPayment: (
    id: string,
    data: {
      payment_reference: string;
      payment_proof_url?: string;
      pay_type?: "solo" | "grouped";
      grouped_amount?: number;
    },
  ) => api.patch(`/registrations/${id}/payment`, data),
  cancel: (id: string) => api.delete(`/registrations/${id}`),
  getQR: (id: string) => api.get(`/registrations/${id}/qr`),
  uploadPaymentProof: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/registrations/${id}/payment-proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  requestCash: (
    id: string,
    data?: {
      pay_type?: "solo" | "grouped";
      grouped_amount?: number;
    },
  ) => api.patch(`/registrations/${id}/request-cash`, data ?? {}),
  addGuest: (
    registrationId: string,
    data: {
      user_id?: string;
      guest_full_name?: string;
      guest_gender?: string;
      guest_skill_level?: string;
      notes?: string;
    },
  ) => api.post(`/registrations/${registrationId}/guests`, data),
  getDetail: (id: string) => api.get(`/registrations/${id}`, { skipErrorToast: true } as any),
};

export const rankingsApi = {
  leaderboard: (params?: { month?: number; year?: number; view?: "year" }) =>
    api.get("/rankings/leaderboard", { params }),
  myRank: () => api.get("/rankings/my-rank"),
  myStats: () => api.get("/rankings/my-stats"),
  winRate: () => api.get("/rankings/win-rate"),
  rankLeaderboard: () => api.get("/rankings/rank-leaderboard"),
};

export const matchesApi = {
  getOne: (id: string) => api.get(`/matches/${id}`),
  list: (params?: any) => api.get("/matches/my", { params }),
  get: (id: string) => api.get(`/matches/${id}`),
  create: (data: any) => api.post("/matches", data),
  accept: (id: string) => api.patch(`/matches/${id}/accept`),
  decline: (id: string, reason?: string) =>
    api.patch(`/matches/${id}/decline`, { reason }),
  submitResult: (
    id: string,
    data: {
      score_a: number;
      score_b: number;
      played_at?: string;
      note?: string;
    },
  ) => api.patch(`/matches/${id}/result`, data),
  getUnseenResults: () => api.get("/matches/results/unseen"),
  markResultSeen: (id: string) => api.patch(`/matches/${id}/seen`),
};

export const usersApi = {
  birthdaysThisMonth: () => api.get("/users/birthday/this-month"),
  searchMembers: (q: string) =>
    api.get("/users/search/members", { params: { q } }),
};

export const notificationsApi = {
  list: (params?: any) => api.get("/notifications", { params }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete("/notifications"),
};

export const walletApi = {
  getMe: () => api.get("/wallet/me"),
  getTransactions: (params?: any) =>
    api.get("/wallet/me/transactions", { params }),
  requestTopup: (data: {
    amount: number;
    payment_method?: "transfer" | "cash";
    payment_reference?: string;
    payment_proof_url?: string;
    note?: string;
  }) => api.post("/wallet/topup", data),
  getMyTopupRequests: (params?: any) =>
    api.get("/wallet/me/topup-requests", { params }),
  payRegistration: (registrationId: string) =>
    api.post(`/wallet/registrations/${registrationId}/pay`),
  confirmGuestPayment: (
    hostRegistrationId: string,
    mode: "grouped" | "separate",
  ) =>
    api.patch(
      `/wallet/registrations/${hostRegistrationId}/confirm-guest-payment`,
      { mode },
    ),
};

export const activitiesApi = {
  list: (params?: any) => api.get("/activities", { params }),
  get: (id: string) => api.get(`/activities/${id}`),
  getMyStatus: (id: string) => api.get(`/activities/${id}/my-status`),
  registerShirtOrder: (
    id: string,
    data: {
      shirt_type_id: string;
      color_id?: string;
      gender: "nam" | "nu";
      size: string;
      quantity?: number;
      jersey_number?: string;
      print_name?: string;
    },
  ) => api.post(`/activities/${id}/register/shirt-order`, data),
  registerTournament: (
    id: string,
    data: { team_name: string; player2_user_id?: string },
  ) => api.post(`/activities/${id}/register/tournament`, data),
  registerOfflineEvent: (
    id: string,
    data: { guest_count?: number; notes?: string },
  ) => api.post(`/activities/${id}/register/offline-event`, data),
  vote: (id: string, optionIds: string[]) =>
    api.post(`/activities/${id}/vote`, { option_ids: optionIds }),
  payShirtOrder: (
    activityId: string,
    data: {
      registration_id?: string;
      method: "wallet" | "transfer" | "cash";
      payment_reference?: string;
    },
  ) => api.post(`/activities/${activityId}/register/shirt-order/payment`, data),
  payTournament: (
    id: string,
    data: {
      method: "wallet" | "transfer" | "cash";
      payment_reference?: string;
    },
  ) => api.post(`/activities/${id}/register/tournament/payment`, data),
  registerTournamentPublic: (id: string, data: any) =>
    api.post(`/activities/${id}/register/tournament/public`, data),
  payTournamentPublic: (
    registrationId: string,
    data: { method: "wallet" | "transfer" | "cash" },
  ) => api.post(`/registrations/${registrationId}/tournament-payment`, data),
  getShirtOrderRegistrationDetail: (regId: string) =>
    api.get(`/activities/shirt-order-registrations/${regId}`, {
      skipErrorToast: true,
    } as any),
  cancelRegistration(activityId: string, registrationId?: string) {
    return api.delete(`/activities/${activityId}/register`, {
      params: {
        registration_id: registrationId,
      },
    });
  },
  updateShirtOrderQuantity: (activityId: string, regId: string, quantity: number) =>
    api.patch(`/activities/${activityId}/register/shirt-order/${regId}/quantity`, { quantity }),

  registerShirtOrderBatch: (activityId: string, items: any[]) =>
    api.post(`/activities/${activityId}/register/shirt-order/batch`, { items }),

  payShirtOrderBatch: (activityId: string, dto: any) =>
    api.post(`/activities/${activityId}/register/shirt-order/payment-batch`, dto),


  registerAndPayShirtOrderBatch: (activityId: string, dto: any) =>
    api.post(`/activities/${activityId}/register/shirt-order/batch-with-payment`, dto),

};

//admin

export const dashboardAdminApi = {
  getStats: () => api.get("/users/dashboard"),
  getMemberTypeCounts: () => api.get("/users/member-type-counts"),
  getWalletSummary: () => api.get("/wallet/admin/summary"),
  getMonthlyFinance: (params?: { month?: number; year?: number }) =>
    api.get("/wallet/admin/monthly-finance", { params }),
  getFinanceHistory: (params?: { months?: number; year?: number }) =>
    api.get("/wallet/admin/finance-history", { params }),
  getFinanceYears: () => api.get("/wallet/admin/finance-years"),
};

export const membersAdminApi = {
  list: (params?: any) => api.get("/users", { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post("/users", data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  updatePassword: (id: string, data: any) =>
    api.patch(`/users/${id}/password`, data),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
  delete: (id: string) => api.delete(`/users/${id}`),
  export: (params?: any) =>
    api.get("/users/export", { params, responseType: "blob" }),
  searchMembers: (q: string) =>
    api.get("/users/search/members", { params: { q } }),
  approve: (id: string) => api.patch(`/users/${id}/approve`),
  reject: (id: string) => api.patch(`/users/${id}/reject`),
};

export const sessionsAdminApi = {
  list: (params?: any) => api.get("/sessions", { params }),
  get: (id: string) => api.get(`/sessions/${id}`),
  create: (data: any) => api.post("/sessions", data),
  update: (id: string, data: any) => api.put(`/sessions/${id}`, data),
  updateStatus: (id: string, data: { status: string }) =>
    api.patch(`/sessions/${id}/status`, data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  getRegistrations: (id: string) => api.get(`/sessions/${id}/registrations`),
  getCost: (id: string) => api.get(`/sessions/${id}/cost`),
  finish: (id: string, data: any) => api.patch(`/sessions/${id}/finish`, data),
  complete: (id: string) => api.patch(`/sessions/${id}/complete`),
  rollbackFinish: (id: string, dto?: { refund_penalties?: boolean }) =>
    api.patch(`/sessions/${id}/rollback-finish`, dto ?? {}),
};

export const registrationsAdminApi = {
  list: (params?: any) => api.get("/registrations", { params }),
  approveRegistration: (id: string) =>
    api.patch(`/registrations/${id}/approve`),
  rejectRegistrationRequest: (id: string) =>
    api.patch(`/registrations/${id}/reject-registration`),
  confirm: (id: string, notes?: string) =>
    api.patch(`/registrations/${id}/confirm`, { notes }),
  reject: (id: string, notes?: string) =>
    api.patch(`/registrations/${id}/reject`, { notes }),
  setAmount: (id: string, amount: number) =>
    api.patch(`/registrations/${id}/amount`, { amount }),
  adminAdd: (data: any) => api.post("/registrations/admin-add", data),
  addGuest: (id: string, data: any) =>
    api.post(`/registrations/${id}/guests`, data),
  checkinPresent: (id: string) =>
    api.patch(`/registrations/${id}/checkin-present`),
  checkinAbsent: (id: string) =>
    api.patch(`/registrations/${id}/checkin-absent`),
  getAdminDetail: (id: string) => api.get(`/registrations/${id}/admin-detail`, { skipErrorToast: true } as any),
  getCheckedInSessions: (userId: string) =>
    api.get("/registrations/checked-in-sessions", { params: { user_id: userId } }),
};

export const matchesAdminApi = {
  list: (params?: any) => api.get("/matches", { params }),
  approve: (
    id: string,
    data?: { score_a?: number; score_b?: number; note?: string },
  ) => api.patch(`/matches/${id}/approve`, data ?? {}),
  reject: (id: string, reason: string) =>
    api.patch(`/matches/${id}/reject`, { reject_reason: reason }),
  adminCreate: (data: any) => api.post("/matches/admin-create", data),
  delete: (id: string) => api.delete(`/matches/${id}`),
  rollback: (id: string) => api.patch(`/matches/${id}/rollback`),
  statusCounts: () => api.get("/matches/status-counts"),
};

export const rankingsAdminApi = {
  leaderboard: (params?: { month?: number; year?: number; view?: 'month' | 'year' }) =>
    api.get("/rankings/leaderboard", { params }),
  reviceLeaderboard: () => api.get("/rankings/revice"),
  winRate: () => api.get("/rankings/win-rate"),
  myStats: () => api.get("/rankings/my-stats"),
  rankLeaderboard: () => api.get("/rankings/rank-leaderboard"),
  myRank: () => api.get("/rankings/my-rank"),
  rankHistory: (limit?: number) =>
    api.get("/rankings/rank-history", { params: { limit } }),
  lpChart: (limit?: number) =>
    api.get("/rankings/lp-chart", { params: { limit } }),
};

export const walletAdminApi = {
  getSummary: () => api.get("/wallet/admin/summary"),
  listMembers: (params?: any) => api.get("/wallet/admin/members", { params }),
  getMemberTransactions: (userId: string, params?: any) =>
    api.get(`/wallet/admin/users/${userId}/transactions`, { params }),
  manualTopup: (userId: string, amount: number, note?: string) =>
    api.post(`/wallet/admin/users/${userId}/topup`, { amount, note }),
  manualAdjust: (userId: string, amount: number, note?: string) =>
    api.post(`/wallet/admin/users/${userId}/adjust`, { amount, note }),
  listTopupRequests: (params?: any) =>
    api.get("/wallet/admin/topup-requests", { params }),
  approveTopup: (id: string) =>
    api.patch(`/wallet/admin/topup-requests/${id}/approve`),
  rejectTopup: (id: string, reason: string) =>
    api.patch(`/wallet/admin/topup-requests/${id}/reject`, { reason }),
  getMonthlyFinance: (params?: { month?: number; year?: number }) =>
    api.get("/wallet/admin/monthly-finance", { params }),
  getFinanceHistory: (params?: { months?: number; year?: number }) =>
    api.get("/wallet/admin/finance-history", { params }),
  getFinanceYears: () => api.get("/wallet/admin/finance-years"),
  exportReport: () => api.get("/wallet/admin/export", { responseType: "blob" }),
};

export const eventsAdminApi = {
  list: (params?: any) => api.get("/admin/activities", { params }),
  get: (id: string) => api.get(`/admin/activities/${id}`),
  create: (data: any) => api.post("/admin/activities", data),
  update: (id: string, data: any) => api.put(`/admin/activities/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/admin/activities/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/admin/activities/${id}`),
  getRegistrations: (id: string) =>
    api.get(`/admin/activities/${id}/registrations`),
  confirmShirtOrder: (regId: string) =>
    api.patch(`/admin/activities/shirt-order-registrations/${regId}/confirm`),
  removeRegistration: (type: string, regId: string) =>
    api.delete(`/admin/activities/${type}/registrations/${regId}`),
  createPoll: (data: any) => api.post("/admin/activities/polls", data),
  getPollOptions: (id: string) =>
    api.get(`/admin/activities/${id}/poll-options`),
  updatePollOptions: (id: string, options: any[]) =>
    api.put(`/admin/activities/${id}/poll-options`, { options }),
  confirmTournamentPayment: (regId: string) =>
    api.patch(`/admin/activities/tournament-registrations/${regId}/confirm`),
  drawTeams: (id: string, data: any) =>
    api.post(`/admin/activities/${id}/tournament/draw-teams`, data),
  adminAddShirtOrderRegistration: (
    activityId: string,
    data: {
      user_id?: string;
      guest_full_name?: string;
      guest_phone?: string;
      shirt_type_id: string;
      color_id?: string;
      gender: "nam" | "nu";
      size: string;
      quantity?: number;
      jersey_number?: string;
      print_name?: string;
      payment_method?: "wallet" | "transfer" | "cash";
    },
  ) =>
    api.post(
      `/admin/activities/${activityId}/shirt-order-registrations`,
      data,
    ),
  rejectShirtOrder: (regId: string) =>
    api.patch(`/admin/activities/shirt-order-registrations/${regId}/reject`),

  approveCancelRequest: (regId: string) =>
    api.patch(`/admin/activities/shirt-order-registrations/${regId}/approve-cancel`),
  rejectCancelRequest: (regId: string, reason?: string) =>
    api.patch(`/admin/activities/shirt-order-registrations/${regId}/reject-cancel`, { reason }),
  getOverview: (params?: { month?: number; year?: number }) =>
    api.get("/admin/activities/overview", { params }),
  finalizeShirtOrder: (activityId: string) =>
    api.post(`/admin/activities/${activityId}/shirt-order/finalize`),
  reopenActivity: (activityId: string) =>
    api.post(`/admin/activities/${activityId}/reopen`),
  reopenActivityWithDeadline: (activityId: string, deadline: string) =>
    api.post(`/admin/activities/${activityId}/reopen-with-deadline`, { deadline }),
  getShirtOrderRegistrationDetail: (registrationId: string) =>
    api.get(`/admin/activities/registrations/${registrationId}/detail`),
  confirmShirtOrderBatch: (ids: string[]) =>
    api.patch(`/admin/activities/shirt-order-registrations/confirm-batch`, { registration_ids: ids }),

  rejectShirtOrderBatch: (ids: string[]) =>
    api.patch(`/admin/activities/shirt-order-registrations/reject-batch`, { registration_ids: ids }),

  getShirtOrderRegistrationsDetailBatch: (ids: string[]) =>
    api.get(`/admin/activities/registrations/detail-batch`, {
      params: { ids: ids.join(",") },
      skipErrorToast: true,
    } as any),

};

export const uploadsAdminApi = {
  upload: (file: File, folder: string = "uploads") => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/admin/uploads?folder=${folder}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};


export const guestShirtOrderApi = {
  getActivity: (id: string) => api.get(`/activities/${id}/public`),
  checkJerseyNumber: (id: string, number: string) =>
    api.get(`/activities/${id}/shirt-order/check-number`, {
      params: { number },
    }),
  submitOrder: (id: string, data: any) =>
    api.post(`/activities/${id}/register/shirt-order/guest-cart`, data),
  uploadPaymentProof: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/uploads/public?folder=payment-proofs`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};


export const handbookAdminApi = {
  tree: () => api.get("/admin/handbook-pages/tree"),
  list: () => api.get("/admin/handbook-pages"),
  get: (id: string) => api.get(`/admin/handbook-pages/${id}`),
  create: (data: any) => api.post("/admin/handbook-pages", data),
  update: (id: string, data: any) => api.patch(`/admin/handbook-pages/${id}`, data),
  delete: (id: string) => api.delete(`/admin/handbook-pages/${id}`),
  reorder: (orderedIds: string[], parent_id?: string | null) =>
    api.patch("/admin/handbook-pages/reorder", { orderedIds, parent_id }),
};

export const handbookPublicApi = {
  tree: () => api.get("/handbook-pages"),
};


export const feedbackApi = {
  send: (message: string) => api.post('/feedback', { message }),
  getMine: () => api.get('/feedback/me'),

  listAdmin: (params?: { search?: string; status?: 'all' | 'read' | 'unread'; page?: number; limit?: number }) =>
    api.get('/feedback/admin', { params }),
  getUserThread: (userId: string) => api.get(`/feedback/admin/user/${userId}`),
  markAllRead: (userId: string) => api.patch(`/feedback/admin/user/${userId}/read`),
  markRead: (id: string) => api.patch(`/feedback/admin/${id}/read`),
  deleteFeedback: (id: string) => api.delete(`/feedback/admin/${id}`),
  getUnreadCount: () => api.get('/feedback/admin/unread-count'),
};


export const fundApi = {
  getSummary: (month?: number, year?: number) =>
    api.get("/fund/summary", { params: { month, year } }),

  listTransactions: (params?: {
    type?: "thu" | "chi";
    category?: "phat" | "dong_gop" | "tai_tro" | "mua_sam" | "tiec_team" | "chi_khac";
    status?: "pending" | "approved" | "rejected" | "reversed";
    payment_status?: "awaiting_choice" | "submitted" | "confirmed" | "rejected";
    search?: string;
    month?: number;
    year?: number;
    session_id?: string;
    deducted_member_id?: string;
    page?: number;
    limit?: number;
  }) => api.get("/fund/transactions", { params }),

  createTransaction: (data: {
    type: "thu" | "chi";
    category: "phat" | "dong_gop" | "tai_tro" | "mua_sam" | "tiec_team" | "chi_khac";
    title: string;
    description?: string;
    amount: number;
    deduct_from_member_id?: string;
    payment_method?: "wallet" | "member_choice";
    session_id?: string;
  }) => api.post("/fund/transactions", data),

  requestTransaction: (data: {
    type: "thu" | "chi";
    category: "phat" | "dong_gop" | "tai_tro" | "mua_sam" | "tiec_team" | "chi_khac";
    title: string;
    description?: string;
    amount: number;
    session_id?: string;
  }) => api.post("/fund/transactions/request", data),

  approve: (id: string) => api.post(`/fund/transactions/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/fund/transactions/${id}/reject`, { reason }),
  remove: (id: string) => api.delete(`/fund/transactions/${id}`),
  cancel: (id: string) => api.post(`/fund/${id}/cancel`),
  exportReport: (month?: number, year?: number) =>
    api.get("/fund/export", { params: { month, year }, responseType: "blob" }),

  getMyContributions: (params?: {
    category?: "phat" | "dong_gop" | "tai_tro" | "mua_sam" | "tiec_team" | "chi_khac";
    payment_status?: "awaiting_choice" | "submitted" | "confirmed" | "rejected";
    page?: number;
    limit?: number;
  }) => api.get("/fund/contributions/my", { params }),

  contributeSelf: (data: {
    category: "dong_gop" | "tai_tro";
    title: string;
    description?: string;
    amount: number;
    method: "wallet" | "bank_transfer" | "cash";
    payment_reference?: string;
    payment_proof_url?: string;
  }) => api.post("/fund/contribute", data),

  submitContributionPayment: (
    id: string,
    data: { method: "wallet" | "bank_transfer" | "cash"; payment_reference?: string; payment_proof_url?: string },
  ) => api.post(`/fund/contributions/${id}/payment`, data),

  confirmContribution: (id: string, notes?: string) =>
    api.post(`/fund/contributions/${id}/confirm`, { notes }),

  rejectContribution: (id: string, reason: string) =>
    api.post(`/fund/contributions/${id}/reject`, { reason }),

  listPendingConfirmations: (params?: { page?: number; limit?: number }) =>
    api.get("/fund/transactions", { params: { ...params, payment_status: "submitted" } }),

  // ADMIN
  createPenalty: (data: {
    session_id?: string;
    deduct_from_member_id: string;
    penalty_type: "late_early" | "special" | "other";
    amount: number;
    title: string;
    description?: string;
    payment_method?: "wallet" | "member_choice";
  }) =>
    api.post("/fund/penalties", {
      type: "thu",
      category: "phat",
      title: data.title,
      description: data.description,
      amount: data.amount,
      deduct_from_member_id: data.deduct_from_member_id,
      payment_method: data.payment_method,
      session_id: data.session_id,
      penalty_type: data.penalty_type,
    }),

  listPenalties: (params?: {
    session_id?: string;
    deducted_member_id?: string;
    status?: "pending" | "approved" | "rejected" | "reversed";
    payment_status?: "awaiting_choice" | "submitted" | "confirmed" | "rejected";
    search?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
  }) => api.get("/fund/penalties", { params }),

  getPenaltiesFundSummary: () => api.get("/fund/penalties/fund-summary"),

  getPendingPenaltyConfirmations: () => api.get("/fund/penalties/pending-confirmations"),

  getPenaltiesBySession: (sessionId: string) =>
    api.get(`/fund/penalties/session/${sessionId}`),

  retryPenaltyWalletDeduction: (id: string) =>
    api.post(`/fund/penalties/${id}/retry-wallet`),

  confirmPenaltyPayment: (id: string, notes?: string) =>
    api.post(`/fund/penalties/${id}/confirm`, { notes }),

  rejectPenaltyPayment: (id: string, reason: string) =>
    api.post(`/fund/penalties/${id}/reject`, { reason }),

  processExpiredPenalties: () => api.post("/fund/penalties/process-expired"),

  removePenalty: (id: string) => api.delete(`/fund/penalties/${id}`),

  // MEMBER
  getMyPenalties: (params?: {
    payment_status?: "awaiting_choice" | "submitted" | "confirmed" | "rejected";
    page?: number;
    limit?: number;
  }) => api.get("/fund/penalties/me", { params }),

  getPenaltyById: (id: string) => api.get(`/fund/penalties/${id}`),

  submitPenaltyPayment: (
    id: string,
    data: { method: "wallet" | "bank_transfer" | "cash"; payment_reference?: string; payment_proof_url?: string },
  ) => api.post(`/fund/penalties/${id}/submit-payment`, data),
};


export const notificationsAdminApi = {
  list: (unread?: boolean) =>
    api.get("/admin/notifications", { params: { unread: unread ? "true" : undefined } }),
  unreadCount: () => api.get("/admin/notifications/unread-count"),
  markRead: (id: string) => api.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => api.patch("/admin/notifications/read-all"),
  delete: (id: string) => api.delete(`/admin/notifications/${id}`),
  deleteAll: () => api.delete("/admin/notifications"),
};