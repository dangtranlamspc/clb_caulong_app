import GuestShirtOrderPage from "../../../components/guest/GuestShirtOrderPage";


export default function Page({
    params,
}: {
    params: { activityId: string };
}) {
    return <GuestShirtOrderPage activityId={params.activityId} />;
}