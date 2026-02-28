import type { Category } from "@/types";

interface CategoryCarouselProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

const CategoryCarousel = ({ categories, selected, onSelect }: CategoryCarouselProps) => {
  return (
    <div className="px-4 pb-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected === null
              ? "bg-foreground text-background"
              : "bg-secondary text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id === selected ? null : cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selected === cat.id
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryCarousel;
