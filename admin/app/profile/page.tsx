"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Paper,
    Avatar,
    IconButton,
    TextField,
    MenuItem,
    Stack,
    Divider,
    Chip,
    CircularProgress,
    Tooltip,
    Badge,
    Tab,
    Tabs,
    Button,
    alpha,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@mui/material";
import {
    User,
    Shield,
    Settings,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Camera,
    CheckCircle,
    Save,
    Globe,
    Lock,
    ArrowRight,
    LogOut,
    Info,
    RefreshCw,
    Building,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { getMe, updateUserProfile, prepareProfileFormData } from "@/api/user";
import { UserRole } from "@/utils/interfaces";
import CustomButton from "@/components/UI/CustomButton";
import { format } from "date-fns";
import { availableResources } from "@/utils/resources";

const validationSchema = Yup.object({
    name: Yup.string().required("Name is required"),
    phoneNumber: Yup.string().nullable(),
    gender: Yup.string().oneOf(["MALE", "FEMALE", ""]),
    dateOfBirth: Yup.date().nullable(),
    address: Yup.string().nullable(),
    country: Yup.string().nullable(),
    partnerName: Yup.string().nullable(),
    emergencyContact: Yup.string().matches(
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        "Invalid emergency contact number"
    ).nullable(),
});

const ProfilePage = () => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dispatch = useDispatch();

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await getMe();

            let userData = null;
            if (response && response.success && response.data) {
                userData = response.data;
            } else if (response && response.id) {

                userData = response;
            }

            if (userData) {
                setProfileData(userData);
                formik.setValues({
                    name: userData.name || "",
                    phoneNumber: userData.phoneNumber || "",
                    gender: userData.gender || "",
                    dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split("T")[0] : "",
                    address: userData.address || "",
                    country: userData.country || "",
                    partnerName: userData.partnerName || "",
                    emergencyContact: userData.emergencyContact || "",
                });
                setAvatarPreview(userData.avatar);
            }
        } catch (error) {
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const formik = useFormik({
        initialValues: {
            name: "",
            phoneNumber: "",
            gender: "",
            dateOfBirth: "",
            address: "",
            country: "",
            partnerName: "",
            emergencyContact: "",
        },
        enableReinitialize: true,
        validationSchema,
        onSubmit: async (values) => {
            try {
                setIsSubmitting(true);
                const formData = prepareProfileFormData({
                    ...values,
                    dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : undefined,
                    avatar: avatarFile || undefined,
                } as any);

                const response = await updateUserProfile(formData, dispatch);
                if (response?.success) {
                    setProfileData(response.data);
                    toast.success("Profile updated successfully");
                }
            } catch (error) {
                toast.error("Failed to update profile");
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const renderPermissionChip = (action: string) => {
        const colors: Record<string, string> = {
            create: "#4caf50",
            read: "#2196f3",
            update: "#ff9800",
            delete: "#f44336",
            view: "#9c27b0",
            export: "#607d8b",
            cancel: "#f44336",
            refund: "#795548",
        };
        return (
            <Chip
                label={action.toUpperCase()}
                size="small"
                sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    height: 20,
                    backgroundColor: alpha(colors[action] || "#757575", 0.1),
                    color: colors[action] || "#757575",
                    border: `1px solid ${alpha(colors[action] || "#757575", 0.3)}`,
                    mr: 0.5,
                    mb: 0.5,
                }}
            />
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "primary.main", color: "white" }}>
                    <User size={28} />
                </Box>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.02em" }}>
                        My Profile
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your personal information, security and account settings
                    </Typography>
                </Box>
            </Stack>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                <div className="lg:col-span-4">
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 1, border: "1px solid #e0e0e0", textAlign: "center", position: "relative", overflow: "hidden" }}>
                        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "100px", background: "linear-gradient(45deg, #1976d2 0%, #64b5f6 100%)", opacity: 0.1, zIndex: 0 }} />

                        <Box sx={{ position: "relative", zIndex: 1, mt: 2 }}>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                badgeContent={
                                    <IconButton
                                        onClick={handleAvatarClick}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            bgcolor: "white",
                                            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                                            "&:hover": { bgcolor: "#f5f5f5" },
                                        }}
                                    >
                                        <Camera size={20} color="#1976d2" />
                                    </IconButton>
                                }
                            >
                                <Avatar
                                    src={avatarPreview || ""}
                                    alt={profileData?.name}
                                    sx={{
                                        width: 140,
                                        height: 140,
                                        border: "5px solid white",
                                        boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
                                        fontSize: "3rem",
                                        bgcolor: "primary.main",
                                    }}
                                >
                                    {profileData?.name?.charAt(0)}
                                </Avatar>
                            </Badge>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />

                            <Typography variant="h5" sx={{ mt: 3, fontWeight: 700 }}>
                                {profileData?.name}
                            </Typography>
                            <Chip
                                label={profileData?.role}
                                sx={{
                                    mt: 1,
                                    fontWeight: 700,
                                    bgcolor: alpha("#1976d2", 0.1),
                                    color: "#1976d2",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                }}
                            />

                            <Stack spacing={2} sx={{ mt: 4, textAlign: "left" }}>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Mail size={18} style={{ marginRight: 12, color: "#757575" }} />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{profileData?.email}</Typography>
                                </Box>
                                {profileData?.phoneNumber && (
                                    <Box sx={{ display: "flex", alignItems: "center" }}>
                                        <Phone size={18} style={{ marginRight: 12, color: "#757575" }} />
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{profileData?.phoneNumber}</Typography>
                                    </Box>
                                )}
                                {(profileData?.joiningDate || profileData?.createdAt) && (
                                    <Box sx={{ display: "flex", alignItems: "center" }}>
                                        <Calendar size={18} style={{ marginRight: 12, color: "#757575" }} />
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            Joined {format(new Date(profileData.joiningDate || profileData.createdAt), "MMM d, yyyy")}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Paper>


                    <Card elevation={0} sx={{ mt: 3, borderRadius: 1, border: "1px solid #e0e0e0" }}>
                        <CardContent>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                <Info size={16} /> Status Info
                            </Typography>
                            <Stack spacing={2}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="body2" color="text.secondary">Verification</Typography>
                                    <Chip label="Verified" size="small" color="success" icon={<CheckCircle size={12} />} sx={{ fontWeight: 600 }} />
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="body2" color="text.secondary">Account Security</Typography>
                                    <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>High</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </div>


                <div className="lg:col-span-8">
                    <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid #e0e0e0", overflow: "hidden" }}>
                        <Tabs
                            value={tabValue}
                            onChange={(_, v) => setTabValue(v)}
                            sx={{
                                bgcolor: "#f8f9fa",
                                borderBottom: "1px solid #e0e0e0",
                                "& .MuiTab-root": {
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.95rem",
                                    minHeight: 64,
                                    px: 4,
                                },
                            }}
                        >
                            <Tab icon={<User size={18} />} iconPosition="start" label="Personal Info" />
                            <Tab icon={<Shield size={18} />} iconPosition="start" label="Permissions" />
                            <Tab icon={<Settings size={18} />} iconPosition="start" label="Account Settings" />
                        </Tabs>

                        <Box sx={{ p: { xs: 3, md: 4 } }}>

                            {tabValue === 0 && (
                                <form onSubmit={formik.handleSubmit}>
                                    <div className="flex justify-between items-center mb-6">
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            Editing Personal Information
                                        </Typography>
                                        <Button
                                            size="small"
                                            onClick={() => fetchProfile()}
                                            startIcon={<RefreshCw size={14} />}
                                            sx={{ color: "text.secondary", textTransform: "none" }}
                                        >
                                            Reset to Current
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Full Name</Typography>
                                            <TextField
                                                fullWidth
                                                name="name"
                                                value={formik.values.name}
                                                onChange={formik.handleChange}
                                                error={formik.touched.name && Boolean(formik.errors.name)}
                                                helperText={formik.touched.name && formik.errors.name}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Phone Number</Typography>
                                            <TextField
                                                fullWidth
                                                name="phoneNumber"
                                                value={formik.values.phoneNumber}
                                                onChange={formik.handleChange}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                        <div>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Gender</Typography>
                                            <TextField
                                                select
                                                fullWidth
                                                name="gender"
                                                value={formik.values.gender}
                                                onChange={formik.handleChange}
                                            >
                                                <MenuItem value="MALE">Male</MenuItem>
                                                <MenuItem value="FEMALE">Female</MenuItem>
                                                <MenuItem value="">Other / Prefer not to say</MenuItem>
                                            </TextField>
                                        </div>
                                        <div>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Date of Birth</Typography>
                                            <TextField
                                                fullWidth
                                                type="date"
                                                name="dateOfBirth"
                                                value={formik.values.dateOfBirth}
                                                onChange={formik.handleChange}
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Country / Region</Typography>
                                            <TextField
                                                fullWidth
                                                name="country"
                                                value={formik.values.country}
                                                onChange={formik.handleChange}
                                                placeholder="Switzerland, Germany, etc."
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Physical Address</Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={3}
                                                name="address"
                                                value={formik.values.address}
                                                onChange={formik.handleChange}
                                                placeholder="Your physical address..."
                                            />
                                        </div>
                                        <div>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Project Partner Name</Typography>
                                            <TextField
                                                fullWidth
                                                name="partnerName"
                                                value={formik.values.partnerName}
                                                onChange={formik.handleChange}
                                                placeholder="Project Partner Name"
                                            />
                                        </div>
                                        <div>
                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Emergency Contact</Typography>
                                            <TextField
                                                fullWidth
                                                name="emergencyContact"
                                                value={formik.values.emergencyContact}
                                                onChange={formik.handleChange}
                                                placeholder="Emergency Contact Number"
                                            />
                                        </div>
                                    </div>

                                    <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                                        <CustomButton
                                            type="submit"
                                            variant="contained"
                                            disabled={isSubmitting}
                                            startIcon={isSubmitting ? <CircularProgress size={16} /> : <Save size={18} />}
                                            sx={{ px: 4, py: 1.5, borderRadius: "4px", fontWeight: 700 }}
                                        >
                                            {isSubmitting ? "Saving..." : "Save Changes"}
                                        </CustomButton>
                                    </Box>
                                </form>
                            )}


                            {tabValue === 1 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                                        <Shield size={22} color="#1976d2" /> Your Access Permissions
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                                        Below are the resources and specific actions you are authorized to perform within the system. These are assigned by your administrator.
                                    </Typography>

                                    {profileData?.role === UserRole.ADMIN ? (
                                        <Box sx={{ p: 4, borderRadius: 1, border: "2px dashed", borderColor: alpha("#1976d2", 0.3), bgcolor: alpha("#1976d2", 0.02), textAlign: "center" }}>
                                            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: alpha("#1976d2", 0.1), color: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                                                <Shield size={32} />
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main", mb: 1 }}>
                                                Full Administrative Access
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto" }}>
                                                As an Administrator, you have unrestricted access to all system resources, modules, and data without any limitations.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Stack spacing={4}>

                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Building size={16} color="#2e7d32" /> Assigned System Resources
                                                </Typography>

                                                {profileData?.assignedResources && profileData.assignedResources.length > 0 ? (
                                                    <Box sx={{ p: 3, borderRadius: 1, border: "1px solid #e8f5e8", bgcolor: alpha("#2e7d32", 0.02) }}>
                                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                                                            {profileData.assignedResources.map((res: string, idx: number) => (
                                                                <Chip
                                                                    key={`${res}-${idx}`}
                                                                    label={res.trim()}
                                                                    sx={{
                                                                        fontWeight: 700,
                                                                        bgcolor: "white",
                                                                        border: "1px solid #c8e6c9",
                                                                        color: "#2e7d32",
                                                                        textTransform: "capitalize"
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ p: 3, textAlign: "center", borderRadius: 1, border: "1px dashed #ccc", bgcolor: "#fafafa" }}>
                                                        <Typography variant="body2" color="text.secondary">No broad resource assignments found</Typography>
                                                    </Box>
                                                )}
                                            </Box>


                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Lock size={16} color="#1976d2" /> Granular Access Controls
                                                </Typography>

                                                {(() => {
                                                    const displayPermissions = [
                                                        ...(profileData?.permissions || []),
                                                        ...(profileData?.assignedResources || [])
                                                            .filter((res: string) => {
                                                                const trimmed = res.trim().toLowerCase();
                                                                return !profileData.permissions?.some((p: any) => p.resource.trim().toLowerCase() === trimmed);
                                                            })
                                                            .map((res: string) => ({
                                                                id: `derived-${res.trim()}`,
                                                                resource: res.trim(),
                                                                actions: []
                                                            }))
                                                    ];

                                                    return displayPermissions.length > 0 ? (
                                                        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                                                            <TableContainer>
                                                                <Table size="small">
                                                                    <TableHead>
                                                                        <TableRow sx={{ bgcolor: "#fafafa" }}>
                                                                            <TableCell sx={{ fontWeight: 700, color: "text.secondary", width: "30%" }}>Resource</TableCell>
                                                                            <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Permissions</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {displayPermissions.map((perm: any) => (
                                                                            <TableRow key={perm.id} sx={{ "&:hover": { bgcolor: "#f8f9fa" } }}>
                                                                                <TableCell sx={{ verticalAlign: "top", py: 2 }}>
                                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{perm.resource}</Typography>
                                                                                </TableCell>
                                                                                <TableCell sx={{ py: 2 }}>
                                                                                    {(() => {
                                                                                        const actions = Array.isArray(perm.actions)
                                                                                            ? perm.actions
                                                                                            : typeof perm.actions === 'string' && (perm.actions as string).length > 0
                                                                                                ? (perm.actions as string).split(',')
                                                                                                : [];

                                                                                        if (actions.length > 0) {
                                                                                            return (
                                                                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                                                                    {actions.map((action: string) => renderPermissionChip(action.toLowerCase().trim()))}
                                                                                                </Box>
                                                                                            );
                                                                                        } else {
                                                                                            return (
                                                                                                <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.75rem' }}>
                                                                                                    Full Access (Default Role Access)
                                                                                                </Typography>
                                                                                            );
                                                                                        }
                                                                                    })()}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </TableContainer>
                                                        </Paper>
                                                    ) : (
                                                        <Box sx={{ textAlign: "center", p: 4, bgcolor: "#f9f9f9", borderRadius: 2, border: "1px solid #f0f0f0" }}>
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Default Role-Based Access Applied</Typography>
                                                            <Typography variant="caption" color="text.disabled">No specific granular overrides found</Typography>
                                                        </Box>
                                                    );
                                                })()}
                                            </Box>
                                        </Stack>
                                    )}

                                    <Box sx={{ mt: 4, p: 2, bgcolor: alpha("#1976d2", 0.05), borderRadius: 2, border: "1px dashed #1976d2" }}>
                                        <Typography variant="body2" sx={{ color: "#1976d2", fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                                            <Lock size={14} /> Note: Role restrictions are also applied at the data level. Sensitive fields may be masked or hidden based on your identity.
                                        </Typography>
                                    </Box>
                                </Box>
                            )}


                            {tabValue === 2 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 4, fontWeight: 700 }}>Security & Settings</Typography>

                                    <Stack spacing={4}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Password Management</Typography>
                                                <Typography variant="body2" color="text.secondary">Update your password to keep your account secure.</Typography>
                                            </Box>
                                            <Button variant="outlined" startIcon={<Lock size={16} />} sx={{ borderRadius: "8px", fontWeight: 700 }}>Change Password</Button>
                                        </Box>

                                        <Divider />

                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Two-Factor Authentication</Typography>
                                                <Typography variant="body2" color="text.secondary">Add an extra layer of security to your account.</Typography>
                                            </Box>
                                            <Chip label="Coming Soon" size="small" sx={{ fontWeight: 600 }} />
                                        </Box>

                                        <Divider />

                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "error.main" }}>Sign Out of All Sessions</Typography>
                                                <Typography variant="body2" color="text.secondary">Security precaution: disconnect all other devices.</Typography>
                                            </Box>
                                            <Button variant="text" color="error" startIcon={<LogOut size={16} />} sx={{ fontWeight: 700 }}>Sign Out All</Button>
                                        </Box>
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </div>
            </div>
        </Box >
    );
};

export default ProfilePage;