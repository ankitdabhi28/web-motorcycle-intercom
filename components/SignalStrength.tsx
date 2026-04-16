"use client";

interface SignalStrengthProps {
  strength: number; // dBm (-100 to -30)
}

export default function SignalStrength({ strength }: SignalStrengthProps) {
  const getBars = () => {
    if (strength > -50) return 4;
    if (strength > -65) return 3;
    if (strength > -80) return 2;
    if (strength > -90) return 1;
    return 0;
  };

  const bars = getBars();

  return (
    <div className="flex gap-0.5 items-end h-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-colors ${
            i < bars ? "bg-green-500" : "bg-gray-300"
          }`}
          style={{ height: 6 + i * 3 }}
        />
      ))}
    </div>
  );
}
