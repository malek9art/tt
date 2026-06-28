export default function ProductCardSkeleton() {
  return (
    <div className="card-base overflow-hidden">
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-3 w-3/4" />
        <div className="flex items-center justify-between mt-2">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
