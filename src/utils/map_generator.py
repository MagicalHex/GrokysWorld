import json
import random
from pathlib import Path
from collections import defaultdict

def input_int(prompt, min_val=None, max_val=None, default=None):
    while True:
        try:
            val = input(f"{prompt} " + (f"[default: {default}] " if default else ""))
            if not val and default is not None:
                return default
            num = int(val)
            if (min_val is None or num >= min_val) and (max_val is None or num <= max_val):
                return num
            print(f"Please enter a number between {min_val} and {max_val}." if min_val and max_val else f"Must be >= {min_val}." if min_val else f"Must be <= {max_val}.")
        except ValueError:
            print("Please enter a valid number.")

def input_list(prompt, example=None):
    while True:
        val = input(f"{prompt} " + (f"(e.g. {example}) " if example else ""))
        if not val.strip():
            print("Can't be empty!")
            continue
        items = [item.strip() for item in val.replace(',', ' ').split()]
        if items:
            return items
        print("Please enter at least one item.")

def input_objects():
    print("\nObjects to place (e.g. mossystone 1-5, stonemossy 5-10):")
    print("  You can enter multiple at once: type 1-5, type 3, type 2-8")
    print("  Or one per line. Type 'done' to finish.\n")
    
    objects = {}
    while True:
        line = input("  > ").strip()
        if line.lower() == 'done':
            break
        if not line:
            continue

        entries = [entry.strip() for entry in line.split(',') if entry.strip()]
        for entry in entries:
            parts = entry.split()
            if len(parts) < 2:
                print(f"  Invalid: '{entry}' — need 'type count' or 'type min-max'")
                continue

            obj_type = parts[0]
            count_str = ' '.join(parts[1:])

            if '-' in count_str:
                range_parts = count_str.split('-')
                if len(range_parts) != 2:
                    print(f"  Invalid range: '{count_str}'. Use: min-max")
                    continue
                try:
                    min_c, max_c = int(range_parts[0]), int(range_parts[1])
                    if min_c > max_c:
                        print(f"  Min > max: {min_c}-{max_c}")
                        continue
                    objects[obj_type] = (min_c, max_c)
                    print(f"  Added: {obj_type} → {min_c}–{max_c}")
                except ValueError:
                    print(f"  Invalid numbers in range: '{count_str}'")
                    continue
            else:
                try:
                    count = int(count_str)
                    if count < 0:
                        print("  Count cannot be negative")
                        continue
                    objects[obj_type] = count
                    print(f"  Added: {obj_type} → {count}")
                except ValueError:
                    print(f"  Invalid count: '{count_str}'")
                    continue
        if entries:
            print("  (Type 'done' when ready)")
    return objects

def generate_liquid_veins(grid, terrain_tiles, liquids, vein_cfg):
    """Create ONE flowing vein per liquid, starting in centre area."""
    height, width = len(grid), len(grid[0])
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]

    # Center start zone: y=9..14, x=5..10 (adjust if grid is smaller)
    start_y_min = max(0, 9)
    start_y_max = min(height, 15)
    start_x_min = max(0, 5)
    start_x_max = min(width, 11)

    if start_y_max <= start_y_min or start_x_max <= start_x_min:
        print("  Warning: Start zone too small for grid size")
        return

    for liquid in liquids:
        if liquid not in vein_cfg:
            continue

        min_len, max_len, min_w, max_w = vein_cfg[liquid]
        target_len = random.randint(min_len, max_len)
        max_width = random.randint(min_w, max_w)

        # Find valid start
        start = None
        attempts = 0
        while attempts < 200:
            y = random.randint(start_y_min, start_y_max - 1)
            x = random.randint(start_x_min, start_x_max - 1)
            if grid[y][x] in terrain_tiles:
                start = (y, x)
                break
            attempts += 1
        if not start:
            print(f"  No valid start for {liquid}")
            continue

        y, x = start
        path = [(y, x)]
        grid[y][x] = liquid  # place first tile

        steps = 1
        while steps < target_len:
            # Get valid neighbors (in bounds + terrain + not in path)
            neighbors = []
            for dy, dx in dirs:
                ny, nx = y + dy, x + dx
                if (0 <= ny < height and 0 <= nx < width and
                    grid[ny][nx] in terrain_tiles and
                    (ny, nx) not in path):
                    # Bias: prefer forward direction
                    score = 1
                    if len(path) >= 2:
                        prev_dy = y - path[-2][0]
                        prev_dx = x - path[-2][1]
                        if (dy, dx) == (prev_dy, prev_dx):
                            score = 10
                        elif abs(dy - prev_dy) + abs(dx - prev_dx) <= 1:
                            score = 3
                    neighbors.append((score, ny, nx))

            if not neighbors:
                break  # nowhere to go

            # Pick next cell
            total = sum(s for s, _, _ in neighbors)
            pick = random.random() * total
            cum = 0
            for score, ny, nx in neighbors:
                cum += score
                if pick <= cum:
                    y, x = ny, nx
                    break

            path.append((y, x))
            grid[y][x] = liquid
            steps += 1

            # Add side tiles (1-3 wide)
            if max_width > 0 and len(path) >= 2:
                # Get direction from last two steps
                dy = y - path[-2][0]
                dx = x - path[-2][1]
                # Perpendicular directions
                perp1 = (-dx, dy)
                perp2 = (dx, -dy)

                side_count = random.randint(0, max_width)  # 0 to max_width
                for _ in range(side_count):
                    pdy, pdx = random.choice([perp1, perp2])
                    for dist in (1, 2):
                        sy, sx = y + pdy * dist, x + pdx * dist
                        if (0 <= sy < height and 0 <= sx < width and
                            grid[sy][sx] in terrain_tiles and
                            (sy, sx) not in path):
                            grid[sy][sx] = liquid
                            break

        print(f"  {liquid} vein: {len(path)} main + side tiles (target {target_len})")

def generate_map_interactive():
    print("Welcome to Groky's World map generator!")
    print("=" * 50)

    # 1. Map name
    name = input("\nWhat name for the map? ").strip()
    while not name:
        name = input("Please enter a name: ").strip()

    # 2. Terrain tiles
    print("\nWhat terrain tiles to use (e.g. msc, mscd)?")
    tile_input = input("Separate with spaces or commas: ").strip()
    terrain_tiles = [t.strip() for t in tile_input.replace(',', ' ').split() if t.strip()]
    while len(terrain_tiles) < 1:
        tile_input = input("At least one tile required: ")
        terrain_tiles = [t.strip() for t in tile_input.replace(',', ' ').split() if t.strip()]
    
    default_tile = terrain_tiles[0]

    # 3. Liquids → ONE flowing vein
    print("\nLiquids for cracks/flows (e.g. slime lava water)?")
    print("  ONE vein per type, starts in center, 1-3 wide, 10-25 long")
    liquid_input = input("Separate with spaces or commas (blank = none): ").strip()
    liquids = [l.strip() for l in liquid_input.replace(',', ' ').split() if l.strip()]

    vein_cfg = {}
    LIQUID_TYPES = {'slime', 'lava', 'water', 'poison', 'acid'}
    for liquid in liquids:
        if liquid in LIQUID_TYPES:
            vein_cfg[liquid] = (20, 50, 1, 3)
            print(f"  Flow: {liquid} → 1 crack (10–25 long, 1–3 wide)")
        else:
            print(f"  Warning: {liquid} ignored")

    # 4. Objects
    objects = input_objects()

    # 5. Seed
    print("\nWant a specific seed? (Leave blank for random)")
    seed_input = input("Seed (optional): ").strip()
    seed = int(seed_input) if seed_input.isdigit() else None
    if seed is not None:
        random.seed(seed)

    # 6. Grid size
    print("\nGrid size:")
    width = input_int("Width (default 24): ", min_val=1, default=24)
    height = input_int("Height (default 16): ", min_val=1, default=16)

    # === GENERATE TERRAIN GRID ===
    grid = [[random.choice(terrain_tiles) for _ in range(width)] for _ in range(height)]

    # === LIQUIDS: ONE flowing vein per type ===
    if vein_cfg:
        print("\nGenerating liquid veins...")
        generate_liquid_veins(grid, set(terrain_tiles), liquids, vein_cfg)

    # === PLACE OBJECTS ===
    object_map = {}
    for obj_type, count in objects.items():
        if isinstance(count, tuple):
            min_c, max_c = count
            num_to_place = random.randint(min_c, max_c)
        else:
            num_to_place = count

        placed = 0
        attempts = 0
        while placed < num_to_place and attempts < 1000:
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            pos_key = f"{x},{y}"
            if pos_key not in object_map:
                object_map[pos_key] = obj_type
                placed += 1
            attempts += 1

        if placed < num_to_place:
            print(f"Warning: Only placed {placed}/{num_to_place} {obj_type}(s)")

    # === SAVE (compact rows) ===
    map_data = {
        "name": name,
        "grid": grid,
        "objects": object_map
    }

    output_dir = Path("maps")
    output_dir.mkdir(exist_ok=True)
    filename = f"maps/{name.lower().replace(' ', '_')}.json"

    # Custom JSON: each row on ONE line
    lines = ["{"]
    lines.append(f'  "name": "{name}",')
    lines.append('  "grid": [')
    for i, row in enumerate(grid):
        row_str = json.dumps(row)
        comma = "," if i < len(grid) - 1 else ""
        lines.append(f"    {row_str}{comma}")
    lines.append('  ],')
    lines.append('  "objects": {')
    obj_items = [f'    "{pos}": "{obj_type}"' for pos, obj_type in sorted(object_map.items())]
    if obj_items:
        lines.append(",\n".join(obj_items))
    else:
        lines.append('    // none')
    lines.append('\n  }')
    lines.append("}")

    Path(filename).write_text('\n'.join(lines))
    
    print(f"\n🎉 SUCCESS! Map saved to:")
    print(f"   {filename}")
    print(f"   {height}×{width} grid | {height*width} tiles")
    print(f"   {len(liquids)} liquid types | {len(object_map)} objects")
    tile_counts = defaultdict(int)
    for row in grid:
        for t in row:
            tile_counts[t] += 1
    print(f"   Tiles: {dict(tile_counts)}")
    if seed:
        print(f"   Seed: {seed}")

if __name__ == "__main__":
    generate_map_interactive()