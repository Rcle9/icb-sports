import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileBottomNav from "./MobileBottomNav";

export default function AppLayout({
  role = "user",
  title = "Dashboard",
  subtitle = "",
  actions = null,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#F5F3F1] lg:pl-[280px]">
      <Sidebar role={role} />

      <main className="min-h-screen px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="mx-auto w-full max-w-[1500px]">
          <Topbar title={title} subtitle={subtitle} actions={actions} />

          {children}
        </div>
      </main>

      <MobileBottomNav role={role} />
    </div>
  );
}