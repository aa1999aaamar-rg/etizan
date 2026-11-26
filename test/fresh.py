
import asyncio,sys
from playwright.async_api import async_playwright
B=sys.argv[1];O=sys.argv[2]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,locale='ar-SA',timezone_id='Asia/Riyadh',is_mobile=True,has_touch=True)
    pg=await ctx.new_page()
    await pg.goto(B+'/');await pg.wait_for_timeout(1500);await pg.locator('.sheet [data-ci]').first.click();await pg.wait_for_timeout(2600)
    await pg.evaluate("location.hash='#/schedule'");await pg.wait_for_timeout(600);await pg.screenshot(path=O+'/f-schedule.png')
    await pg.evaluate("location.hash='#/prayer'");await pg.wait_for_timeout(600);await pg.screenshot(path=O+'/f-prayer.png')
    await b.close()
asyncio.run(main())
