"use client";
import { useState } from "react";
import { motion, useMotionValue, animate, PanInfo } from "framer-motion";

const ACTION_WIDTH = 152;

export function SwipeableRow({
  children,
  actions,
  disabled = false,
}: {
  children: React.ReactNode;
  actions: React.ReactNode;
  disabled?: boolean;
}) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);

  if (!actions || disabled) return <>{children}</>;

  const snapTo = (target: number) => {
    animate(x, target, {
      type: "spring",
      stiffness: 500,
      damping: 45,
      mass: 0.6,
    });
    setOpen(target !== 0);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const shouldOpen =
      info.offset.x < -ACTION_WIDTH / 2 || info.velocity.x < -400;
    snapTo(shouldOpen ? -ACTION_WIDTH : 0);
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3"
        style={{ width: ACTION_WIDTH }}
      >
        {actions}
      </div>

      <motion.div
        className="relative bg-white"
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (open) snapTo(0);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
