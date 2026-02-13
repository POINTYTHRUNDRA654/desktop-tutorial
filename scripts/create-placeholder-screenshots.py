#!/usr/bin/env python3
"""
Create placeholder screenshots for the Mossy tutorial
These are temporary placeholders until real screenshots can be captured
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create screenshots directory if it doesn't exist
screenshot_dir = "docs/screenshots"
os.makedirs(screenshot_dir, exist_ok=True)

# Define placeholders to create
placeholders = [
    {
        "filename": "nexus-dashboard-overview.png",
        "title": "The Nexus Dashboard",
        "description": "Main dashboard with module cards"
    },
    {
        "filename": "sidebar-navigation.png",
        "title": "Sidebar Navigation",
        "description": "Module categories and navigation"
    },
    {
        "filename": "chat-interface.png",
        "title": "Chat Interface",
        "description": "AI conversation with Mossy"
    },
    {
        "filename": "live-voice-listening.png",
        "title": "Live Voice Chat",
        "description": "Voice interaction interface"
    },
    {
        "filename": "image-suite-main.png",
        "title": "Image Suite",
        "description": "PBR texture generation tool"
    },
    {
        "filename": "auditor-main.png",
        "title": "The Auditor",
        "description": "Asset analysis and validation"
    },
    {
        "filename": "workshop-editor.png",
        "title": "Workshop Code Editor",
        "description": "Papyrus script editor"
    },
    {
        "filename": "settings-general.png",
        "title": "Settings",
        "description": "Application configuration"
    },
    {
        "filename": "learning-hub-main.png",
        "title": "Learning Hub",
        "description": "Modding documentation and guides"
    },
]

def create_placeholder(filename, title, description, width=1920, height=1080):
    """Create a placeholder image with text"""
    # Create a gradient background
    img = Image.new('RGB', (width, height), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Draw a gradient-like effect
    for y in range(height):
        brightness = int(26 + (y / height) * 40)
        color = f'#{brightness:02x}{brightness:02x}{brightness+20:02x}'
        draw.line([(0, y), (width, y)], fill=color)
    
    # Draw border
    border_color = '#4a90e2'
    border_width = 8
    draw.rectangle(
        [border_width, border_width, width - border_width, height - border_width],
        outline=border_color,
        width=border_width
    )
    
    # Try to use a nice font, fall back to default if not available
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        desc_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        info_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except:
        title_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        info_font = ImageFont.load_default()
    
    # Draw title
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = height // 2 - 60
    draw.text((title_x, title_y), title, fill='#ffffff', font=title_font)
    
    # Draw description
    desc_bbox = draw.textbbox((0, 0), description, font=desc_font)
    desc_width = desc_bbox[2] - desc_bbox[0]
    desc_x = (width - desc_width) // 2
    desc_y = title_y + 100
    draw.text((desc_x, desc_y), description, fill='#b0b0b0', font=desc_font)
    
    # Draw placeholder notice
    notice = "[ PLACEHOLDER - Run 'npm run capture-screenshots' to generate real screenshot ]"
    notice_bbox = draw.textbbox((0, 0), notice, font=info_font)
    notice_width = notice_bbox[2] - notice_bbox[0]
    notice_x = (width - notice_width) // 2
    notice_y = height - 100
    draw.text((notice_x, notice_y), notice, fill='#666666', font=info_font)
    
    # Draw Mossy branding
    brand = "Mossy - Fallout 4 Modding Assistant"
    brand_bbox = draw.textbbox((0, 0), brand, font=info_font)
    brand_width = brand_bbox[2] - brand_bbox[0]
    brand_x = (width - brand_width) // 2
    brand_y = 60
    draw.text((brand_x, brand_y), brand, fill='#4a90e2', font=info_font)
    
    # Save the image
    filepath = os.path.join(screenshot_dir, filename)
    img.save(filepath, 'PNG', optimize=True)
    print(f"✅ Created: {filepath}")

def main():
    print("🎨 Creating placeholder screenshots for Mossy tutorial...\n")
    
    for placeholder in placeholders:
        create_placeholder(
            placeholder["filename"],
            placeholder["title"],
            placeholder["description"]
        )
    
    print(f"\n✅ Created {len(placeholders)} placeholder screenshots")
    print(f"📁 Location: {screenshot_dir}/")
    print("\n📝 Next steps:")
    print("   1. Start the app with: npm run dev")
    print("   2. Run: npm run capture-screenshots")
    print("   3. Replace these placeholders with real screenshots")
    print("\n   Or capture screenshots manually and replace these files.")

if __name__ == "__main__":
    main()
