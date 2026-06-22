import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import { navbarStyles as ns } from "../assets/dummyStyles"
import logoImg from '../assets/logo.png'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  UserPlus,
  Users,
  Calendar,
  Grid,
  PlusSquare,
  List,
  Menu,
  X
} from 'lucide-react'
import { useClerk, useAuth, useUser } from "@clerk/clerk-react";

const Navbar = () => {
  const navInnerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const indicatorRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const clerk = useClerk()
  const {getToken, isLoaded: authLoaded} = useAuth()
  const {isSignedIn, user, isLoaded: userLoaded} = useUser()

  //slidind active indicator
    const moveIndicator = useCallback(() => {
    const container = navInnerRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;

    const active = container.querySelector(".nav-item.active");
    if (!active) {
      ind.style.opacity = "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const left = activeRect.left - containerRect.left + container.scrollLeft;
    const width = activeRect.width;

    ind.style.transform = `translateX(${left}px)`;
    ind.style.width = `${width}px`;
    ind.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    moveIndicator();
    const t = setTimeout(() => {
      moveIndicator();
    }, 120);
    return () => clearTimeout(t);
  }, [location.pathname, moveIndicator]);

  useEffect(() => {
    const container = navInnerRef.current;
    if (!container) return;

    const onScroll = () => {
      moveIndicator();
    };
    container.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      moveIndicator();
    });
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);

    window.addEventListener("resize", moveIndicator);

    moveIndicator();

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", moveIndicator);
    };
  }, [moveIndicator]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); 
  // when user signed in, fetch the token and save it to local storage
  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      if (!authLoaded || !userLoaded) return;
      if (!isSignedIn) {
        try {
          localStorage.removeItem("clerk_token");
        } catch (err) {
        }
        return;
      }
      try {
        if (getToken) {
          const token = await getToken();
          if (!mounted) return;
          if (token) {
            try {
              localStorage.setItem("clerk_token", token);
            } catch (err) {
              console.warn("Failed to save token to localStorage:", err);
            }
          }
        }
      } catch (error) {
        console.warn("could not retrieve token:", error);
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [isSignedIn, getToken, authLoaded, userLoaded]);

  // to open sign in page
  const handleOpenSignIn = () => {
    if (!clerk || !clerk.openSignIn) {
      console.warn("Clerk is not available");
      return;
    }
    clerk.openSignIn();
    navigate("/h");
  };

  //to sign out
  const handleSignOut = async () => {
    if (!clerk || !clerk.signOut) {
      console.warn("Clerk is not available");
      return;
    }
    try {
      await clerk.signOut();
    } catch (error) {
      console.warn("Failed to sign out:", error);
    } finally {
      try {
        localStorage.removeItem("clerk_token");
      } catch (err) {
        // Ignore localStorage errors
      }

      navigate("/");
    }
  }

  return (
    <header className={ns.header}>
      <nav className={ns.navbarContainer}>
        <div className={ns.flexContainer}>

          {/* Logo Section */}
          <div className={ns.logoContainer}>
            <img
              src={logoImg}
              alt="logo"
              className={ns.logoImage}
            />

            <Link to="/">
              <div className={ns.logoLink}>MediCare</div>
              <div className={ns.logoSubtext}>
                Healthcare Solutions
              </div>
            </Link>
          </div>

          {/* Navigation Section */}
          <div className={ns.centerNavContainer}>
            <div className={ns.glowEffect}>
              <div className={ns.centerNavInner}>

                <div
                  ref={navInnerRef}
                  tabIndex={0}
                  className={ns.centerNavScrollContainer}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >

                  <CenterNavItem
                    to="/h"
                    label="Dashboard"
                    icon={<Home size={16} />}
                  />

                  <CenterNavItem
                    to="/add"
                    label="Add Doctor"
                    icon={<UserPlus size={16} />}
                  />

                  <CenterNavItem
                    to="/list"
                    label="List Doctors"
                    icon={<Users size={16} />}
                  />

                  <CenterNavItem
                    to="/appointments"
                    label="Appointments"
                    icon={<Calendar size={16} />}
                  />

                  <CenterNavItem
                    to="/service-dashboard"
                    label="Service Dashboard"
                    icon={<Grid size={16} />}
                  />

                  <CenterNavItem
                    to="/add-service"
                    label="Add Service"
                    icon={<PlusSquare size={16} />}
                  />

                  <CenterNavItem
                    to="/list-service"
                    label="List Services"
                    icon={<List size={16} />}
                  />

                  <CenterNavItem
                    to="/service-appointments"
                    label="Service Appointments"
                    icon={<Calendar size={16} />}
                  />

                </div>
              </div>
            </div>
          </div>
          {/* Placeholder for right-aligned items */}
          <div className={ns.rightContainer}>
            {isSignedIn ? (
              <div className='hidden lg:flex items-center gap-2'>
                <button
                  onClick={handleSignOut}
                  className={ns.loginButton + ' ' + ns.cursorPointer}>
                    Sign Out
                </button>
              </div>
            ) : (
              <div className='hidden lg:flex items-center gap-2'>
                <button
                  onClick={handleOpenSignIn}
                  className={ns.loginButton + ' ' + ns.cursorPointer}>
                    LogIn
                  </button>
              </div>
            )}
            {/* mobile toggle button */}
            <button onClick={() => setOpen((v) => !v)} className={ns.mobileMenuButton}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>
        {/* mobile navigation menu */}
        {open && (
          <div className={ns.mobileOveray} onClick={() => setOpen(false)} />
        )}
        {open && (
          <div className={ns.mobileMenuContainer} id="mobile-menu">
            <div className={ns.mobileMenuInner}>
              <MobileItem
                to="/h"
                label="Dashboard"
                icon={<Home size={16} />}
                onClick={() => setOpen(false)}
              />

              <MobileItem
                to="/add"
                label="Add Doctor"
                icon={<UserPlus size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/list"
                label="List Doctors"
                icon={<Users size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/appointments"
                label="Appointments"
                icon={<Calendar size={16} />}
                onClick={() => setOpen(false)}
              />

              <MobileItem
                to="/service-dashboard"
                label="Service Dashboard"
                icon={<Grid size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/add-service"
                label="Add Service"
                icon={<PlusSquare size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/list-service"
                label="List Services"
                icon={<List size={16} />}
                onClick={() => setOpen(false)}
              />
              <MobileItem
                to="/service-appointments"
                label="Service Appointments"
                icon={<Calendar size={16} />}
                onClick={() => setOpen(false)}
              />
              <div className={ns.mobileAuthContainer}>
                {isSignedIn ? (
                  <button
                      onClick={() => {
                        handleSignOut();
                        setOpen(false);
                      }}
                      className={ns.mobileSignOutButton + ' ' + ns.cursorPointer}>
                        Sign Out
                      </button>
                    ) : (
                      <div className='space -y-2'>
                        <button
                          onClick={() => {
                            handleOpenSignIn();
                            setOpen(false);
                          }}
                          className={ns.mobileLoginButton + ' ' + ns.cursorPointer}>
                            Log In
                          </button>
                      </div>
                    )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar

function CenterNavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `nav-item ${
          isActive ? 'active' : ''
        } ${ns.centerNavItemBase} ${
          isActive
            ? ns.centerNavItemActive
            : ns.centerNavItemInactive
        }`
      }
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </NavLink>
  )
}

function MobileItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to} onClick={onClick} className={({ isActive }) =>
        `${ns.mobileItemBase} ${isActive ? ns.mobileItemActive : ns.mobileItemInactive}`
      }
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
}