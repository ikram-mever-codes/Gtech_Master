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
} from "@mui/material";
import {
  LucideMenu,
  LucideChevronLeft,
  LucideChevronRight,
  LucideShield,
  LucideChevronUp,
  LucideChevronDown,
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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    resource: "Delivery",
    children: [
      {
        icon: Receipt,
        text: "Orders",
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
        icon: Timer,
        text: "Scheduled Items",
        path: "/scheduled",
        resource: "Scheduled Items",
      },
    ],
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
    resource: "Settings",
    children: [
      {
        icon: LucideUsers,
        text: "Users",
        path: "/users",
        resource: "Users",
      },
      {
        icon: LucideTag,
        text: "Tags",
        path: "/tags",
        resource: "Tags",
      },
      {
        icon: CreditCard,
        text: "Payment Methods",
        path: "/payment-methods",
        resource: "Settings",
      },
      {
        icon: LucideGlobe,
        text: "Countries",
        path: "/countries",
        resource: "Settings",
      },
      {
        icon: LucidePercent,
        text: "Tax Profiles",
        path: "/tax-profiles",
        resource: "Settings",
      },
    ],
  },
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.user);
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md"),
  );

  const activePath = usePathname();
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);

  // Access-aware menu (ADMIN sees everything).
  const menuItems = useMemo<MenuEntry[]>(() => {
    if (!user || user.role === "ADMIN") return allMenuItems;
    const userResources = user.assignedResources || [];

    const allowed = (resource: string) => {
      // 1. "Tags" should be visible to users of any type
      if (resource === "Tags") return true;

      // 2. Purchasing Team must see everything under Fulfillment AND Items
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

      // 3. Fallback to admin-assigned access lists
      return userResources.includes(resource);
    };

    return allMenuItems
      .map((item) => {
        if (item.children) {
          const kids = item.children.filter((c) => allowed(c.resource));
          // If the group parent text is allowed OR has valid child items, render it
          return kids.length || allowed(item.resource)
            ? { ...item, children: kids }
            : null;
        }
        return allowed(item.resource) ? item : null;
      })
      .filter(Boolean) as MenuEntry[];
  }, [user]);

  const isPathActive = useCallback(
    (path?: string) =>
      !!path && (activePath === path || activePath.startsWith(path)),
    [activePath],
  );

  const isGroupActive = useCallback(
    (item: MenuEntry) =>
      isPathActive(item.path) ||
      !!item.children?.some((c) => isPathActive(c.path)),
    [isPathActive],
  );

  // Auto-open the group that contains the active route
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

  // Recalculate on resize
  useEffect(() => {
    if (!isMounted) return;
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateScrollButtons, menuItems, isCollapsed, isMounted]);

  // Reliable recalculation whenever the menu's height changes
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
        {user?.role && !isCollapsed && (
          <Box sx={{ px: 3, mb: 2, flexShrink: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 1,
                backgroundColor: "rgba(140, 194, 27, 0.15)",
              }}
            >
              <LucideShield
                size={16}
                color={theme.palette.primary.main}
                style={{ marginRight: 8 }}
              />
              <Typography
                variant="caption"
                sx={{ color: "primary.main", fontWeight: 600 }}
              >
                {user.role} ACCESS
              </Typography>
            </Box>
          </Box>
        )}
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
            fontSize: "17px",
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