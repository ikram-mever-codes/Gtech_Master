"use client";

import { logoutUser } from "@/api/user";
import { RootState } from "@/app/Redux/store";
import theme from "@/styles/theme";
import {
  BusinessCenterSharp,
  LibraryAdd,
  Logout,
  Person,
  ShopSharp,
} from "@mui/icons-material";
import {
  Box,
  List,
  ListItem,
  ListItemText,
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
} from "@mui/material";
import {
  LucideHome,
  LucideUsers,
  LucideBox,
  LucideChartBar,
  LucideSettings,
  LucideMenu,
  LucideChevronLeft,
  LucideMoveRight,
  LucideChevronRight,
  LucideShield,
  LucideFileText,
  LucideShoppingCart,
  LucideMail,
  LucideHelpCircle,
  Timer,
  BookUser,
  DollarSign,
  IceCream2,
  PackageSearchIcon,
  LucideChevronUp,
  LucideChevronDown,
  BoxesIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

// Define all possible menu items and their required resources
const allMenuItems = [
  {
    icon: LucideHome,
    text: "Dashboard",
    path: "/dashboard",
    resource: "Dashboard",
  },
  {
    icon: LucideUsers,
    text: "Users",
    path: "/users",
    resource: "Users",
  },
  {
    icon: ShopSharp,
    text: "Items Management",
    path: "/items",
    resource: "Items",
  },
  {
    icon: Timer,
    text: "Scheduled Items",
    path: "/scheduled",
    resource: "Users",
  },
  {
    icon: BusinessCenterSharp,
    text: "Bussinesses",
    path: "/bussinesses",
    resource: "Bussinesses",
  },
  {
    icon: BookUser,
    text: "Contacts",
    path: "/contacts",
    resource: "Contacts",
  },
  {
    icon: PackageSearchIcon,
    text: "Inquiries & Requests",
    path: "/inquiry",
    resource: "inquiries",
  },
  {
    icon: BoxesIcon,
    text: "Offers",
    path: "/offers",
    resource: "offers",
  },
  {
    icon: DollarSign,
    text: "Invoices",
    path: "/invoices",
    resource: "Invoices",
  },
  {
    icon: LibraryAdd,
    text: "Library",
    path: "/library",
    resource: "Library",
  },
    {
    icon: LucideFileText,
    text: "Orders",
    path: "/orders",
    resource: "Orders",
  },
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.user);
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("md")
  );

  const activePath = usePathname();
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);

  // Filter menu items based on user role and assigned resources
  const menuItems = useMemo(() => {
    return allMenuItems;
  }, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logoutUser(dispatch);
  };

  // Check scroll position and update arrow visibility
  const updateScrollButtons = useCallback(() => {
    if (menuContainerRef.current && menuContentRef.current) {
      const container = menuContainerRef.current;
      const content = menuContentRef.current;

      const canScrollUp = container.scrollTop > 0;
      const canScrollDown =
        container.scrollTop + container.clientHeight < content.scrollHeight - 1;

      setShowScrollUp(canScrollUp);
      setShowScrollDown(canScrollDown);
      setHasOverflow(content.scrollHeight > container.clientHeight);
    }
  }, []);

  // Handle scroll up
  const scrollUp = () => {
    if (menuContainerRef.current) {
      menuContainerRef.current.scrollBy({ top: -100, behavior: "smooth" });
    }
  };

  // Handle scroll down
  const scrollDown = () => {
    if (menuContainerRef.current) {
      menuContainerRef.current.scrollBy({ top: 100, behavior: "smooth" });
    }
  };

  // Update scroll buttons on resize and menu items change
  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => {
      setTimeout(updateScrollButtons, 100); // Small delay to ensure DOM is updated
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateScrollButtons, menuItems, isCollapsed]);

  // Update scroll buttons when sidebar state changes
  useEffect(() => {
    const timer = setTimeout(updateScrollButtons, 150);
    return () => clearTimeout(timer);
  }, [isCollapsed, updateScrollButtons]);

  // Handle scroll events
  const handleScroll = () => {
    updateScrollButtons();
  };

  const drawerContent = (
    <Box
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
        sx={{
          px: 2,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "space-between" : "flex-end",
          height: "90px",
          overflow: "hidden",
        }}
      >
        <Link href="/" style={{ flexShrink: 0 }}>
          <Image
            alt="Gtech"
            src="/logo.png"
            width={isCollapsed ? 80 : 170}
            height={isCollapsed ? 80 : 780}
            priority
            style={{
              transition: "all 0.3s ease",
              objectFit: "contain",
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
            display: { xs: "none", sm: "flex" },
          }}
        >
          <LucideChevronRight color={theme.palette.text.secondary} />
        </IconButton>
      )}

      <List
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Divider sx={{ borderColor: "divider", mb: 2 }} />

        {/* Scroll Up Button - Only shows when needed */}
        <Fade in={hasOverflow && showScrollUp}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 0.5,
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

        {/* Scrollable Menu Container */}
        <Box
          ref={menuContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            // Hide scrollbar for all browsers
            scrollbarWidth: "none", // Firefox
            "&::-webkit-scrollbar": {
              display: "none", // Chrome, Safari, Edge
            },
            // Hide scrollbar for IE/Edge
            msOverflowStyle: "none",
          }}
        >
          {/* Menu Content */}
          <Box
            ref={menuContentRef}
            sx={{
              width: "100%",
              px: 1,
              pb: 1, // Padding at bottom for better scroll end visibility
            }}
          >
            {menuItems.map((item) => (
              <Tooltip
                key={item.text}
                title={isCollapsed ? item.text : ""}
                placement="right"
                arrow
              >
                <ListItem
                  component={Link}
                  href={item.path}
                  sx={{
                    borderTopLeftRadius: "5px",
                    borderBottomLeftRadius: "5px",
                    mb: 0.5,
                    mx: 1,
                    backgroundColor:
                      activePath === item.path || activePath.includes(item.path)
                        ? "rgba(255, 255, 255, 0.15)"
                        : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      transform: "translateX(4px)",
                    },
                    minHeight: 48,
                    overflow: "hidden",
                    position: "relative",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width:
                        activePath === item.path ||
                        activePath.includes(item.path)
                          ? "3px"
                          : 0,
                      backgroundColor: "primary.main",
                      transition: "width 0.3s ease",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color:
                        activePath === item.path ||
                        activePath.includes(item.path)
                          ? "white"
                          : "text.secondary",
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
                      color: activePath === item.path ? "white" : "#777777",
                    }}
                  >
                    {item.text}
                  </Typography>
                </ListItem>
              </Tooltip>
            ))}
          </Box>
        </Box>
        {/* Scroll Down Button - Only shows when needed */}
        <Fade in={hasOverflow && showScrollDown}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 0.5,
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

        <Divider sx={{ borderColor: "divider", my: 2 }} />

        {/* If admin, show a section with user role info */}
        {user?.role && !isCollapsed && (
          <Box sx={{ px: 3, mb: 2 }}>
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
          py: 2,
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
      {isMobile && (
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
        variant={isMobile ? "temporary" : "permanent"}
        open={!isMobile ? true : mobileOpen}
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
