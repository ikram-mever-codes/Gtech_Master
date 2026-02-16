// admin/app/dashboard/Dashboard.tsx
import AdminCustomersPage from "../scheduled/lists/page";
import AdminListDetailPage from "../scheduled/lists/[id]/page";
import AdminAllItemsPage from "../scheduled/page";
import { LayoutDashboard } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";

export default function Dashboard() {
    return (
        <div>
            <PageHeader title="Dashboard" icon={LayoutDashboard} />
            <section>
                <h2>All Items</h2>
                <AdminAllItemsPage />
            </section>
            <section>
                <h2>Customers</h2>
                <AdminCustomersPage />
            </section>
            <section>
                <h2>List Details</h2>
                <AdminListDetailPage />
            </section>
        </div>
    );
}
