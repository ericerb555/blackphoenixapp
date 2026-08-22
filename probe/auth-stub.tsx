export const useAuth = () => ({
  user: null, session: null, loading: false, userRole: null,
  isOwner: false, isMasterAdmin: false, isAdmin: false,
  needsOnboarding: false, hasPermission: () => false,
  signIn: async () => ({}), signUp: async () => ({}), signOut: async () => {},
  companyContext: null, switchCompany: () => {}, getActiveCompanyId: () => null,
});
export const AuthProvider = ({ children }: any) => children;
export default { useAuth, AuthProvider };
