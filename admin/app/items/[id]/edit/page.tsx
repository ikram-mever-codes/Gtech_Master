"use client";

import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
    LucideArrowLeft,
    LucideSave,
    LucidePackage,
    LucideSettings,
    LucideBox,
    LucideFileText,
    LucideCheck,
    LucideAlertCircle,
    LucideInfo,
    LucideImage,
} from "lucide-react";
import {
    Tabs,
    Tab,
    Typography,
    MenuItem,
    FormControl,
    Select,
    Button,
    Box,
    Paper,
    TextField,
    CircularProgress,
    Alert,
    IconButton,
    alpha,
    useTheme,
    Grid,
    Switch,
    FormControlLabel,
    InputAdornment,
    Breadcrumbs,
} from "@mui/material";
import theme from "@/styles/theme";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import {
    getItemById,
    updateItem,
    getParents,
    getAllTarics,
} from "@/api/items";
import { getCategories } from "@/api/categories";
import CustomButton from "@/components/UI/CustomButton";

const validationSchema = Yup.object({
    item_name: Yup.string().required("Item name is required"),
    parent_id: Yup.number().required("Parent is required").min(1, "Please select a parent"),
    ean: Yup.string().nullable(),
    weight: Yup.number().min(0, "Must be positive").nullable(),
    length: Yup.number().min(0, "Must be positive").nullable(),
    width: Yup.number().min(0, "Must be positive").nullable(),
    height: Yup.number().min(0, "Must be positive").nullable(),
});

const EditItemPage = () => {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    const [parents, setParents] = useState<any[]>([]);
    const [tarics, setTarics] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const formik = useFormik({
        initialValues: {
            item_name: "",
            item_name_cn: "",
            ean: "",
            parent_id: 0,
            taric_id: 0,
            cat_id: 0,
            weight: 0,
            length: 0,
            width: 0,
            height: 0,
            model: "",
            remark: "",
            npr_remark: "",
            photo: "",
            pix_path_eBay: "",
            isActive: true,
            is_qty_dividable: true,
            is_npr: false,
            is_eur_special: false,
            is_rmb_special: false,
            // New fields
            isbn: "",
            mc: "0",
            er: "0",
            foq: "0",
            is_pu_item: false,
            is_meter_item: false,
            is_dimension_special: false,
            id_de: "",
            msq: "0",
            buffer: "0",
            is_nao: false,
            is_snsi: false,
            rmb_price: "0",
        },
        validationSchema,
        onSubmit: async (values) => {
            setSaving(true);
            try {
                const payload = {
                    item_name: values.item_name,
                    item_name_cn: values.item_name_cn,
                    isActive: values.isActive ? "Y" : "N",
                    is_qty_dividable: values.is_qty_dividable ? "Y" : "N",
                    is_npr: values.is_npr ? "Y" : "N",
                    is_eur_special: values.is_eur_special ? "Y" : "N",
                    is_rmb_special: values.is_rmb_special ? "Y" : "N",
                    is_dimension_special: values.is_dimension_special ? "Y" : "N",
                    is_pu_item: values.is_pu_item ? 1 : 0,
                    is_meter_item: values.is_meter_item ? 1 : 0,
                    parent_id: Number(values.parent_id),
                    taric_id: values.taric_id ? Number(values.taric_id) : undefined,
                    cat_id: values.cat_id ? Number(values.cat_id) : undefined,
                    weight: Number(values.weight),
                    length: Number(values.length),
                    width: Number(values.width),
                    height: Number(values.height),
                    ean: values.ean ? values.ean.toString().trim() : null,
                    remark: values.remark,
                    model: values.model,
                    photo: values.photo,
                    pix_path_eBay: values.pix_path_eBay,
                    npr_remark: values.npr_remark,
                    ISBN: Number(values.isbn),
                    many_components: Number(values.mc),
                    effort_rating: Number(values.er),
                    FOQ: Number(values.foq),
                    ItemID_DE: Number(values.id_de),
                    RMB_Price: Number(values.rmb_price),
                };

                const response: any = await updateItem(Number(id), payload);
                if (response.success) {
                    toast.success("Item updated successfully");
                    router.push("/items");
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to update item");
            } finally {
                setSaving(false);
            }
        },
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [itemRes, parentsRes, taricsRes, catsRes]: any = await Promise.all([
                    getItemById(Number(id)),
                    getParents({ limit: 1000, isActive: "Y" }),
                    getAllTarics({ limit: 1000 }),
                    getCategories(),
                ]);

                if (itemRes.success) {
                    const item = itemRes.data;
                    const parentId = item.parent_id || (parentsRes.data?.find((p: any) => p.de_no === item.parent?.noDE)?.id || 0);
                    const taricId = item.taric_id || (taricsRes.data?.find((t: any) => t.code === item.others?.taricCode)?.id || 0);
                    const catId = item.cat_id || (catsRes.data?.find((c: any) => c.name === item.category)?.id || 0);

                    formik.setValues({
                        item_name: item.name || "",
                        item_name_cn: item.nameCN || "",
                        ean: item.ean || "",
                        parent_id: parentId,
                        taric_id: taricId,
                        cat_id: catId,
                        weight: Number(item.dimensions?.weight) || 0,
                        length: Number(item.dimensions?.length) || 0,
                        width: Number(item.dimensions?.width) || 0,
                        height: Number(item.dimensions?.height) || 0,
                        model: item.model || "",
                        remark: item.remark || "",
                        npr_remark: item.nprRemarks || "",
                        photo: item.pictures?.shopPicture || "",
                        pix_path_eBay: item.pictures?.ebayPictures || "",
                        isActive: item.isActive,
                        is_qty_dividable: item.others?.isQTYdiv || false,
                        is_npr: item.others?.isNPR || false,
                        is_eur_special: item.parent?.isEURSpecial || false,
                        is_rmb_special: item.parent?.isRMBSpecial || false,
                        isbn: item.dimensions?.isbn || "1",
                        mc: item.others?.mc || "0",
                        er: item.others?.er || "0",
                        foq: item.others?.foq || "0",
                        is_pu_item: item.others?.isPU || false,
                        is_meter_item: item.others?.isMeter || false,
                        is_dimension_special: item.others?.isDimensionSpecial || false,
                        id_de: item.others?.idDE || "",
                        msq: item.others?.msq || "0",
                        buffer: item.others?.buffer || "0",
                        is_nao: item.others?.isNAO || false,
                        is_snsi: item.others?.isSnSI || false,
                        rmb_price: item.others?.rmbPrice || item.parent?.priceRMB || "0",
                    });
                }

                if (parentsRes.success) setParents(parentsRes.data);
                if (taricsRes.success) setTarics(taricsRes.data);
                if (catsRes.success) setCategories(catsRes.data);

            } catch (err: any) {
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress size={40} sx={{ color: "#8CC21B" }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 0, maxWidth: "1200px", mx: "auto", pb: 8 }}>
            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                    <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{ mb: 1 }}>
                        <Link href="/items" style={{ textDecoration: "none", color: "inherit" }}>
                            <Typography variant="body2" sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
                                Items
                            </Typography>
                        </Link>
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                            Edit Item
                        </Typography>
                    </Breadcrumbs>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "secondary.main", display: "flex", alignItems: "center", gap: 2 }}>
                        <LucidePackage size={32} color="#8CC21B" />
                        {formik.values.item_name || "Edit Item"}
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => router.back()}
                        startIcon={<LucideArrowLeft size={18} />}
                        sx={{
                            borderRadius: "4px",
                            borderColor: "#e0e0e0",
                            color: "text.primary",
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            "&:hover": { borderColor: "#ccc", bgcolor: "#f5f5f5" }
                        }}
                    >
                        Back
                    </Button>
                    <CustomButton
                        onClick={() => formik.handleSubmit()}
                        disabled={saving || !formik.dirty}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <LucideSave size={18} />}
                        gradient
                        shadow="medium"
                        rounded="small"
                        sx={{ px: 4 }}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </CustomButton>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: "4px" }}>{error}</Alert>}

            <Paper elevation={0} sx={{ borderRadius: "8px", border: "1px solid #e0e0e0", overflow: "hidden" }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: '#fafafa',
                        '& .MuiTab-root': {
                            py: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: '0.95rem'
                        }
                    }}
                >
                    <Tab label="General Information" icon={<LucideBox size={18} />} iconPosition="start" />
                    <Tab label="Logistics & Dims" icon={<LucideSettings size={18} />} iconPosition="start" />
                    <Tab label="Assets & Remarks" icon={<LucideFileText size={18} />} iconPosition="start" />
                    <Tab label="Warehouse Info" icon={<LucideInfo size={18} />} iconPosition="start" />
                </Tabs>

                <Box sx={{ p: 4 }}>
                    {activeTab === 0 && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Item Name (German)"
                                    {...formik.getFieldProps('item_name')}
                                    error={formik.touched.item_name && Boolean(formik.errors.item_name)}
                                    helperText={formik.touched.item_name && formik.errors.item_name}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField fullWidth label="Item Name (Chinese)" {...formik.getFieldProps('item_name_cn')} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField fullWidth label="EAN / Barcode" {...formik.getFieldProps('ean')} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField fullWidth label="Model" {...formik.getFieldProps('model')} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth>
                                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>Category</Typography>
                                    <Select {...formik.getFieldProps('cat_id')}>
                                        <MenuItem value={0}>Select Category</MenuItem>
                                        {categories.map((cat) => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth>
                                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>Parent Product</Typography>
                                    <Select {...formik.getFieldProps('parent_id')}>
                                        <MenuItem value={0}>Select Parent</MenuItem>
                                        {parents.map((parent) => <MenuItem key={parent.id} value={parent.id}>{parent.de_no} - {parent.name_de}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <FormControlLabel
                                    control={<Switch checked={formik.values.isActive} onChange={(e) => formik.setFieldValue("isActive", e.target.checked)} />}
                                    label="Is Active?"
                                />
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === 1 && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Weight (kg)" type="number" {...formik.getFieldProps('weight')} /></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Length (cm)" type="number" {...formik.getFieldProps('length')} /></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Width (cm)" type="number" {...formik.getFieldProps('width')} /></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Height (cm)" type="number" {...formik.getFieldProps('height')} /></Grid>

                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="ISBN" {...formik.getFieldProps('isbn')} /></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="MC" {...formik.getFieldProps('mc')} /></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="ER" {...formik.getFieldProps('er')} /></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="FOQ" {...formik.getFieldProps('foq')} /></Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth>
                                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: "text.secondary" }}>TARIC Code</Typography>
                                    <Select {...formik.getFieldProps('taric_id')}>
                                        <MenuItem value={0}>Select TARIC</MenuItem>
                                        {tarics.map((taric) => <MenuItem key={taric.id} value={taric.id}>{taric.code} - {taric.name_en}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, md: 8 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                    <FormControlLabel control={<Switch checked={formik.values.is_qty_dividable} onChange={(e) => formik.setFieldValue("is_qty_dividable", e.target.checked)} />} label="Qty Dividable" />
                                    <FormControlLabel control={<Switch checked={formik.values.is_dimension_special} onChange={(e) => formik.setFieldValue("is_dimension_special", e.target.checked)} />} label="Special Dimensions" />
                                    <FormControlLabel control={<Switch checked={formik.values.is_pu_item} onChange={(e) => formik.setFieldValue("is_pu_item", e.target.checked)} />} label="Is PU Item" />
                                    <FormControlLabel control={<Switch checked={formik.values.is_meter_item} onChange={(e) => formik.setFieldValue("is_meter_item", e.target.checked)} />} label="Is Meter Item" />
                                    <FormControlLabel control={<Switch checked={formik.values.is_eur_special} onChange={(e) => formik.setFieldValue("is_eur_special", e.target.checked)} />} label="EUR Special" />
                                    <FormControlLabel control={<Switch checked={formik.values.is_rmb_special} onChange={(e) => formik.setFieldValue("is_rmb_special", e.target.checked)} />} label="RMB Special" />
                                </Box>
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === 2 && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Shop Photo URL" {...formik.getFieldProps('photo')} /></Grid>
                            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="eBay Pictures Path" {...formik.getFieldProps('pix_path_eBay')} /></Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField fullWidth multiline rows={3} label="General Remarks" {...formik.getFieldProps('remark')} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField fullWidth multiline rows={2} label="NPR Remarks" {...formik.getFieldProps('npr_remark')} />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel control={<Switch checked={formik.values.is_npr} onChange={(e) => formik.setFieldValue("is_npr", e.target.checked)} />} label="Is NPR?" />
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === 3 && (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="ID DE" {...formik.getFieldProps('id_de')} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="MSQ" {...formik.getFieldProps('msq')} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Buffer" {...formik.getFieldProps('buffer')} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="RMB Price" {...formik.getFieldProps('rmb_price')} /></Grid>

                            <Grid size={{ xs: 12, md: 8 }}>
                                <Box sx={{ display: 'flex', gap: 4 }}>
                                    <FormControlLabel control={<Switch checked={formik.values.is_nao} onChange={(e) => formik.setFieldValue("is_nao", e.target.checked)} />} label="is NAO" />
                                    <FormControlLabel control={<Switch checked={formik.values.is_snsi} onChange={(e) => formik.setFieldValue("is_snsi", e.target.checked)} />} label="is SnSI" />
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default EditItemPage;
