"use client";

import { logoutUser } from "@/api/user";
import { RootState } from "@/app/Redux/store";
import theme from "@/styles/theme";
import { Logout } from "@mui/icons-material";
import {
  Box,
  List,
  ListItem,
  Divider,
  Typography,
  ListItemIcon,
  IconButton,
  useMediaQuery,
  Theme,
  Drawer,
  Button,
  Tooltip,
  Fade,
  Collapse,
  Avatar,
  Menu,
  MenuItem,
  ListItemText,
  alpha,
} from "@mui/material";
import {
  LucideMenu,
  LucideChevronLeft,
  LucideChevronRight,
  LucideShield,
  LucideChevronUp,
  LucideChevronDown,
  LucideUser,
  LucideSettings,
  Bell,
  Mail,
  LogOut,
  Shield,
  Tag as LucideTag,
  Users as LucideUsers,
  Handshake,
  MessagesSquare,
  Package,
  DollarSign,
  Truck,
  AlertTriangle,
  Settings,
  FileText,
  FileCheck,
  Receipt,
  ReceiptText,
  ClipboardList,
  ShoppingCart,
  Timer,
  Globe as LucideGlobe,
  Percent as LucidePercent,
  CreditCard,
  Hash,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

type MenuChild = {
  icon: any;
  text: string;
  path: string;
  resource: string;
};
type MenuEntry = {
  icon: any;
  text: string;
  path?: string;
  resource: string;
  children?: MenuChild[];
};

const allMenuItems: MenuEntry[] = [
  {
    icon: Handshake,
    text: "Relationships",
    path: "/bussinesses",
    resource: "Bussinesses",
  },
  {
    icon: MessagesSquare,
    text: "Collaboration",
    path: "/inquiry",
    resource: "Inquiries",
  },
  {
    icon: Package,
    text: "Items",
    path: "/items",
    resource: "Items",
  },
  {
    icon: DollarSign,
    text: "Commercial",
    path: "/commercial",
    resource: "Invoices",
  },
  {
    icon: Truck,
    text: "Fulfillment",
    path: "/invoices",
    resource: "Invoices",
  },
  {
    icon: ShoppingCart,
    text: "Order Processing",
    path: "/orders",
    resource: "Orders",
  },

  {
    icon: AlertTriangle,
    text: "Attention",
    path: "/attention",
    resource: "Attention",
  },
  {
    icon: Settings,
    text: "Settings",
    path: "/tags",
    resource: "Settings",
  },
];

const Sidebar = () => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const openUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const closeUserMenu = () => {
    setAnchorEl(null);
  };
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.user);
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md"),
  );

  const activePath = usePathname();
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo<MenuEntry[]>(() => {
    if (!user || user.role === "ADMIN") return allMenuItems;
    const userResources = user.assignedResources || [];

    const allowed = (resource: string) => {
      if (resource === "Tags") return true;

      if (
        user.role === "PURCHASING" &&
        (resource === "Items" ||
          resource === "Delivery" ||
          resource === "Invoices" ||
          resource === "Orders" ||
          resource === "Scheduled Items")
      ) {
        return true;
      }

      return userResources.includes(resource);
    };

    return allMenuItems
      .map((item) => {
        if (item.children) {
          const kids = item.children.filter((c) => allowed(c.resource));
          return kids.length || allowed(item.resource)
            ? { ...item, children: kids }
            : null;
        }
        return allowed(item.resource) ? item : null;
      })
      .filter(Boolean) as MenuEntry[];
  }, [user]);

  const isPathActive = useCallback(
    (path?: string) => {
      if (!path) return false;
      const settingsPaths = [
        "/tags",
        "/payment-methods",
        "/shipping-methods",
        "/tax-profiles",
        "/users",
        "/numbers",
        "/countries",
        "/gtech-companies",
        "/settings/gtech-companies",
        "/parameters-templates",
        "/settings/parameters-templates",
      ];
      if (path === "/tags" && settingsPaths.some((sp) => activePath === sp || activePath.startsWith(sp))) {
        return true;
      }
      return activePath === path || activePath.startsWith(path);
    },
    [activePath],
  );

  const isGroupActive = useCallback(
    (item: MenuEntry) =>
      isPathActive(item.path) ||
      !!item.children?.some((c) => isPathActive(c.path)),
    [isPathActive],
  );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children && item.children.some((c) => isPathActive(c.path))) {
        next[item.text] = true;
      }
    });
    if (Object.keys(next).length) {
      setOpenGroups((prev) => ({ ...prev, ...next }));
    }
  }, [activePath, menuItems, isPathActive]);

  const toggleGroup = (text: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups((prev) => ({ ...prev, [text]: true }));
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logoutUser(dispatch);
  };

  const updateScrollButtons = useCallback(() => {
    const container = menuContainerRef.current;
    const content = menuContentRef.current;
    if (!container || !content) return;

    const overflow = content.scrollHeight > container.clientHeight + 1;
    const canScrollUp = container.scrollTop > 0;
    const canScrollDown =
      container.scrollTop + container.clientHeight < content.scrollHeight - 1;

    setHasOverflow(overflow);
    setShowScrollUp(overflow && canScrollUp);
    setShowScrollDown(overflow && canScrollDown);
  }, []);

  const scrollUp = () => {
    menuContainerRef.current?.scrollBy({ top: -120, behavior: "smooth" });
  };

  const scrollDown = () => {
    menuContainerRef.current?.scrollBy({ top: 120, behavior: "smooth" });
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateScrollButtons, menuItems, isCollapsed, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const container = menuContainerRef.current;
    const content = menuContentRef.current;
    if (!container || !content) return;

    const ro = new ResizeObserver(() => updateScrollButtons());
    ro.observe(container);
    ro.observe(content);
    updateScrollButtons();
    return () => ro.disconnect();
  }, [isMounted, updateScrollButtons, menuItems]);

  const handleScroll = () => {
    if (isMounted) updateScrollButtons();
  };

  const rowSx = (active: boolean) => ({
    borderTopLeftRadius: "5px",
    borderBottomLeftRadius: "5px",
    mb: 0.5,
    mx: 1,
    cursor: "pointer",
    backgroundColor: active ? "rgba(255, 255, 255, 0.15)" : "transparent",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      transform: "translateX(4px)",
    },
    minHeight: 48,
    overflow: "hidden",
    position: "relative" as const,
    "&::after": {
      content: '""',
      position: "absolute" as const,
      left: 0,
      top: 0,
      height: "100%",
      width: active ? "3px" : 0,
      backgroundColor: "primary.main",
      transition: "width 0.3s ease",
    },
  });

  const drawerContent = (
    <Box
      suppressHydrationWarning
      sx={{
        width: { xs: 240, sm: isCollapsed ? 80 : 280 },
        backgroundColor: "secondary.main",
        height: "100vh",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Box
        suppressHydrationWarning
        sx={{
          px: 2,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "space-between" : "flex-end",
          height: "90px",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Link href="/dashboard" style={{ flexShrink: 0 }}>
          <Image
            alt="Gtech"
            src="/logo.png"
            width={isCollapsed ? 80 : 170}
            height={isCollapsed ? 80 : 80}
            priority
            style={{
              transition: "all 0.3s ease",
              objectFit: "contain",
              height: "auto",
            }}
          />
        </Link>
        {!isCollapsed && (
          <IconButton
            onClick={() => setIsCollapsed(!isCollapsed)}
            sx={{
              display: { xs: "none", sm: "flex" },
            }}
          >
            <LucideChevronLeft color={theme.palette.text.secondary} />
          </IconButton>
        )}
      </Box>

      {isCollapsed && (
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            width: "100%",
            color: "text.secondary",
            flexShrink: 0,
            display: { xs: "none", sm: "flex" },
          }}
        >
          <LucideChevronRight color={theme.palette.text.secondary} />
        </IconButton>
      )}

      <List
        suppressHydrationWarning
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Divider sx={{ borderColor: "divider", mb: 2, flexShrink: 0 }} />
        <Fade in={isMounted && hasOverflow && showScrollUp}>
          <Box
            suppressHydrationWarning
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 0.5,
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <IconButton
              onClick={scrollUp}
              size="small"
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                },
                width: 24,
                height: 24,
              }}
            >
              <LucideChevronUp size={16} color={"white"} />
            </IconButton>
          </Box>
        </Fade>

        <Box
          suppressHydrationWarning
          ref={menuContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            msOverflowStyle: "none",
          }}
        >
          <Box
            suppressHydrationWarning
            ref={menuContentRef}
            sx={{
              width: "100%",
              px: 1,
              pb: 0,
            }}
          >
            {menuItems.map((item) => {
              const active = isGroupActive(item);
              const hasChildren = !!item.children?.length;
              const isOpen = !!openGroups[item.text];

              if (hasChildren) {
                return (
                  <Box key={item.text}>
                    <Tooltip
                      title={isCollapsed ? item.text : ""}
                      placement="right"
                      arrow
                    >
                      <ListItem
                        onClick={() => toggleGroup(item.text)}
                        sx={rowSx(active)}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 40,
                            color: active ? "white" : "text.secondary",
                            transition: "color 0.2s ease",
                          }}
                        >
                          <item.icon size={20} />
                        </ListItemIcon>
                        <Typography
                          sx={{
                            fontWeight: 400,
                            flex: 1,
                            opacity: isCollapsed ? 0 : 1,
                            transition: "opacity 0.2s ease, color 0.2s ease",
                            whiteSpace: "nowrap",
                            color: active ? "white" : "#777777",
                          }}
                        >
                          {item.text}
                        </Typography>
                        {!isCollapsed &&
                          (isOpen ? (
                            <LucideChevronUp
                              size={16}
                              color={theme.palette.text.secondary}
                            />
                          ) : (
                            <LucideChevronDown
                              size={16}
                              color={theme.palette.text.secondary}
                            />
                          ))}
                      </ListItem>
                    </Tooltip>

                    <Collapse
                      in={!isCollapsed && isOpen}
                      timeout="auto"
                      unmountOnExit
                      onEntered={updateScrollButtons}
                      onExited={updateScrollButtons}
                    >
                      <Box sx={{ pl: 2 }}>
                        {item.children!.map((child) => {
                          const childActive = isPathActive(child.path);
                          return (
                            <ListItem
                              key={child.text}
                              component={Link}
                              href={child.path}
                              sx={{
                                ...rowSx(childActive),
                                minHeight: 40,
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: 34,
                                  color: childActive
                                    ? "white"
                                    : "text.secondary",
                                  transition: "color 0.2s ease",
                                }}
                              >
                                <child.icon size={17} />
                              </ListItemIcon>
                              <Typography
                                sx={{
                                  fontSize: "0.9rem",
                                  fontWeight: 400,
                                  whiteSpace: "nowrap",
                                  color: childActive ? "white" : "#777777",
                                }}
                              >
                                {child.text}
                              </Typography>
                            </ListItem>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </Box>
                );
              }

              return (
                <Tooltip
                  key={item.text}
                  title={isCollapsed ? item.text : ""}
                  placement="right"
                  arrow
                >
                  <ListItem
                    component={Link}
                    href={item.path!}
                    sx={rowSx(active)}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: active ? "white" : "text.secondary",
                        transition: "color 0.2s ease",
                      }}
                    >
                      <item.icon size={20} />
                    </ListItemIcon>
                    <Typography
                      sx={{
                        fontWeight: 400,
                        opacity: isCollapsed ? 0 : 1,
                        transition: "opacity 0.2s ease, color 0.2s ease",
                        whiteSpace: "nowrap",
                        color: active ? "white" : "#777777",
                      }}
                    >
                      {item.text}
                    </Typography>
                  </ListItem>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
        <Fade in={isMounted && hasOverflow && showScrollDown}>
          <Box
            suppressHydrationWarning
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 0.5,
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <IconButton
              onClick={scrollDown}
              size="small"
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                },
                width: 24,
                height: 24,
              }}
            >
              <LucideChevronDown size={16} color={"white"} />
            </IconButton>
          </Box>
        </Fade>
        <Divider sx={{ borderColor: "divider", my: 2, flexShrink: 0 }} />

        <Box sx={{ px: 2, mb: 1, width: "100%", flexShrink: 0 }}>
          <Box
            onClick={openUserMenu}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              padding: "0px",
              borderRadius: 1.5,
              cursor: "pointer",
              transition: "all 0.2s ease",
              justifyContent: isCollapsed ? "center" : "flex-start",
            }}
          >
            <Avatar
              src={user?.avatar}
              alt={user?.name}
              sx={{
                width: 34,
                height: 34,
                bgcolor: theme.palette.primary.main,
                color: "white",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              {!user?.avatar && user?.name?.charAt(0)}
            </Avatar>

            {!isCollapsed && (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.name || "User"}
                </Typography>
                {user?.role && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "primary.main",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      display: "block",
                    }}
                  >
                    {user.role} ACCESS
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={closeUserMenu}
            onClick={closeUserMenu}
            PaperProps={{
              elevation: 4,
              sx: {
                minWidth: 240,
                maxWidth: 300,
                overflow: "visible",
                filter: "drop-shadow(0px 4px 12px rgba(0,0,0,0.15))",
                mb: 1,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              },
            }}
            transformOrigin={{ horizontal: "left", vertical: "bottom" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  src={user?.avatar}
                  alt={user?.name}
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: theme.palette.primary.main,
                  }}
                >
                  {!user?.avatar && user?.name?.charAt(0)}
                </Avatar>
                <Box sx={{ ml: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email || "user@example.com"}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 0.5,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                <Shield
                  size={14}
                  color={theme.palette.primary.main}
                  style={{ marginRight: "6px" }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.primary.main, fontWeight: 600 }}
                >
                  {user?.role || "Admin"} ACCESS
                </Typography>
              </Box>
            </Box>

            <Divider />

            <MenuItem sx={{ py: 1 }}>
              <ListItemIcon>
                <LucideSettings
                  size={18}
                  color={theme.palette.text.secondary}
                />
              </ListItemIcon>
              <ListItemText
                primary="Account Settings"
                primaryTypographyProps={{ fontSize: "0.85rem" }}
              />
            </MenuItem>

            <MenuItem
              sx={{ py: 1 }}
              onClick={() => {
                router.push("/profile");
                closeUserMenu();
              }}
            >
              <ListItemIcon>
                <LucideUser size={18} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary="Profile"
                primaryTypographyProps={{ fontSize: "0.85rem" }}
              />
            </MenuItem>

            <MenuItem sx={{ py: 1 }}>
              <ListItemIcon>
                <Bell size={18} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary="Notifications"
                primaryTypographyProps={{ fontSize: "0.85rem" }}
              />
            </MenuItem>

            <MenuItem sx={{ py: 1 }}>
              <ListItemIcon>
                <Mail size={18} color={theme.palette.text.secondary} />
              </ListItemIcon>
              <ListItemText
                primary="Messages"
                primaryTypographyProps={{ fontSize: "0.85rem" }}
              />
            </MenuItem>

            <Divider />

            <Box sx={{ p: 1 }}>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  py: 1,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                  color: theme.palette.error.main,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.15),
                  },
                }}
              >
                <ListItemIcon>
                  <LogOut size={18} color={theme.palette.error.main} />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  primaryTypographyProps={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: theme.palette.error.main,
                  }}
                />
              </MenuItem>
            </Box>
          </Menu>
        </Box>
      </List>

      <Box
        sx={{
          px: 2,
          width: "100%",
          pb: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Button
          onClick={handleLogout}
          startIcon={<Logout />}
          sx={{
            width: "100%",
            color: "white",
            backgroundColor: "primary.main",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          {!isCollapsed && "Logout"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {isMounted && isMobile && (
        <IconButton
          color="inherit"
          onClick={handleDrawerToggle}
          sx={{
            position: "sticky",
            top: 16,
            left: 16,
            zIndex: 1300,
            color: "primary.contrastText",
            backgroundColor: "secondary.main",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
          }}
        >
          <LucideMenu />
        </IconButton>
      )}

      <Drawer
        suppressHydrationWarning
        variant={isMounted && isMobile ? "temporary" : "permanent"}
        open={!(isMounted && isMobile) ? true : mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            backgroundColor: "secondary.main",
            borderRight: "1px solid",
            borderColor: "divider",
            overflowX: "hidden",
            position: "sticky",
            height: "100%",
            top: 0,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
export default Sidebar;
