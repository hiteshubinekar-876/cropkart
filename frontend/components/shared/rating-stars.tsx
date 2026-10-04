import { Star } from "lucide-react";

type RatingStarsProps = {
  rating: number;
};

export function RatingStars({ rating }: RatingStarsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Star className="h-3.5 w-3.5 fill-current" />
      {rating.toFixed(1)}
    </div>
  );
}
