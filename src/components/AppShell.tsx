import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Grid2X2, LogOut, Settings2, Sparkles } from "lucide-react";
import { useAuth } from "../app/useAuth";
import { BrandMark } from "./BrandMark";

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="主导航">
        <NavLink className="brand" to="/" aria-label="Assan 应用库首页">
          <BrandMark />
          <span className="brand-copy">
            <strong>Assan</strong>
            <small>应用库</small>
          </span>
        </NavLink>

        <div className="sidebar-label">工作空间</div>
        <nav className="side-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Grid2X2 size={18} strokeWidth={1.8} /> <span>应用总览</span>
          </NavLink>
          <NavLink
            to="/account"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Settings2 size={18} strokeWidth={1.8} /> <span>账户设置</span>
          </NavLink>
          {user?.role === "admin" && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <Settings2 size={18} /> <span>用户管理</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-note">
          <span className="note-icon">
            <Sparkles size={16} />
          </span>
          <strong>小而顺手</strong>
          <p>把常用的小工具，收进一个安静的角落。</p>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">
            {user?.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-copy">
            <strong>{user?.username}</strong>
            <span>个人工作空间</span>
          </div>
          <button
            className="icon-button signout-button"
            type="button"
            onClick={handleSignOut}
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>工作空间</span>
            <span className="crumb-separator">/</span>
            <strong>应用总览</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-greeting">你好，{user?.username}</span>
            <div className="avatar avatar-small">
              {user?.username.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
        <footer className="app-footer">
          <span>
            <span className="footer-brand-mark"><BrandMark /></span> Assan 应用库
          </span>
          <span>让日常小事，简单一点。</span>
        </footer>
      </main>
    </div>
  );
}
