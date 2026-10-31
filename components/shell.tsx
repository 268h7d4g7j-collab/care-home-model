"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Building2,
  LayoutDashboard,
  UsersRound,
  BedDouble,
  ChartNoAxesCombined,
  Settings,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";
import { companies, homes } from "@/lib/data";
const Scope = createContext({ company: "all", home: "all" });
export const useScope = () => useContext(Scope);
const navigation = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/residents", label: "Residents", icon: UsersRound },
  { path: "/occupancy", label: "Occupancy", icon: BedDouble },
  { path: "/revenue", label: "Revenue", icon: ChartNoAxesCombined },
  { path: "/settings", label: "Settings", icon: Settings },
];
export function Shell({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState("all");
  const [home, setHome] = useState("all");
  const pathname = usePathname();
  return (
    <Scope.Provider value={{ company, home }}>
      <div className="app-shell">
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <HeartHandshake size={24} />
            </span>
            <span>
              Care Home <strong>Revenue</strong>
            </span>
          </Link>
          <div className="scope-controls">
            <label>
              Company
              <select
                aria-label="Company"
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setHome("all");
                }}
              >
                <option value="all">All Companies</option>
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Care Home
              <select
                aria-label="Care Home"
                value={home}
                onChange={(event) => setHome(event.target.value)}
              >
                <option value="all">All Homes</option>
                {homes
                  .filter(
                    (item) => company === "all" || item.companyId === company,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <span className="demo-badge">Demo workspace</span>
        </header>
        <aside className="sidebar">
          <div className="nav-caption">WORKSPACE</div>
          <nav aria-label="Main navigation">
            {navigation.map(({ path, label, icon: Icon }) => {
              const active =
                path === "/" ? pathname === "/" : pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  href={path}
                  className={`nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {active && <ChevronRight size={16} />}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-note">
            <Building2 size={22} />
            <strong>Built around your homes</strong>
            <p>One workspace for your care group.</p>
            <span>Demonstration data only</span>
          </div>
        </aside>
        <main>
          {children}
          <footer>
            Care Home Revenue <span>Fictional data · Visual foundation</span>
          </footer>
        </main>
      </div>
    </Scope.Provider>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const { company, home } = useScope();
  return (
    <>
      <div className="breadcrumb">
        Workspace <ChevronRight size={13} />
        <span>{title}</span>
      </div>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </div>
      <div className="scope-summary">
        <Building2 size={15} />
        <span>
          {companies.find((item) => item.id === company)?.name ??
            "All Companies"}
        </span>
        <span className="scope-divider">/</span>
        <span>
          {homes.find((item) => item.id === home)?.name ?? "All Homes"}
        </span>
      </div>
    </>
  );
}
