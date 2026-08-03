export type CartItem = {
    cart_id: string;
    shirt_type_id: string;
    shirt_type_name: string;
    color_id?: string | null;
    color_name?: string | null;
    image?: string | null;
    gender: "nam" | "nu";
    size: string;
    quantity: number;
    unit_price: number;
    jersey_number?: string;
    print_name?: string;
};