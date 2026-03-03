import { Router, Request, Response } from 'express';

const router = Router();

const AMAP_KEY = '700ad2685f70c21499d6a29b96369dae';

/**
 * GET /api/map/staticmap?address=xxx&city=xxx
 *
 * 1. 调用高德地理编码 API 将地址转换为经纬度
 * 2. 构造静态地图图片 URL 并返回
 *
 * 参考: https://lbs.amap.com/api/webservice/guide/api/staticmaps
 */
router.get('/staticmap', async (req: Request, res: Response) => {
  try {
    const { address, city } = req.query;

    if (!address) {
      return res.status(400).json({ message: 'address is required' });
    }

    // Step 1: 地理编码 — 地址 → 经纬度
    const geocodeUrl =
      `https://restapi.amap.com/v3/geocode/geo` +
      `?address=${encodeURIComponent(String(address))}` +
      `&city=${encodeURIComponent(String(city || ''))}` +
      `&output=JSON` +
      `&key=${AMAP_KEY}`;

    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData: any = await geocodeRes.json();

    if (
      geocodeData.status !== '1' ||
      !geocodeData.geocodes ||
      geocodeData.geocodes.length === 0
    ) {
      return res
        .status(404)
        .json({ message: '地理编码失败，无法定位该地址', detail: geocodeData });
    }

    const location: string = geocodeData.geocodes[0].location; // "116.397428,39.90923"

    // Step 2: 构建静态地图 URL
    // markers 格式: size,color,label:经度,纬度
    const staticMapUrl =
      `https://restapi.amap.com/v3/staticmap` +
      `?location=${location}` +
      `&zoom=15` +
      `&size=750*300` +
      `&scale=2` +
      `&markers=mid,0xFF4B4B,A:${location}` +
      `&key=${AMAP_KEY}`;

    res.json({ url: staticMapUrl, location });
  } catch (err: any) {
    console.error('Static map error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
