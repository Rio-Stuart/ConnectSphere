from PIL import Image

def analyze_screenshots():
    for name in ['spline_dark_mode.png', 'spline_light_mode.png']:
        img = Image.open(f'audit_evidence/{name}')
        w, h = img.size
        # Sample background corners
        c_tl = img.getpixel((10, 10))
        c_tr = img.getpixel((w - 10, 10))
        c_bl = img.getpixel((10, h - 10))
        # Sample inside the 600x500 container
        # Container is roughly x: 300 to 900, y: 190 to 690
        inside_bg = img.getpixel((350, 220)) # top left inside container
        center = img.getpixel((w // 2, h // 2)) # center where robot is
        bottom_inside = img.getpixel((w // 2, 600)) # lower part inside container
        print(f"=== {name} ({w}x{h}) ===")
        print(f"  Corner TL: {c_tl}")
        print(f"  Inside Container Top-Left: {inside_bg}")
        print(f"  Center: {center}")
        print(f"  Bottom Inside Container: {bottom_inside}")

if __name__ == '__main__':
    analyze_screenshots()
