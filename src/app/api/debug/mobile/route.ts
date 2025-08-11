import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const allParams = Object.fromEntries(searchParams.entries());
  const headers = Object.fromEntries(req.headers.entries());
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    url: req.url,
    searchParams: allParams,
    headers: headers,
    userAgent: req.headers.get('user-agent'),
    isMobileUserAgent: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers.get('user-agent') || ''),
    cloudFrontHeaders: {
      isDesktopViewer: headers['cloudfront-is-desktop-viewer'],
      isMobileViewer: headers['cloudfront-is-mobile-viewer'],
      isIosViewer: headers['cloudfront-is-ios-viewer'],
      isAndroidViewer: headers['cloudfront-is-android-viewer'],
      isTabletViewer: headers['cloudfront-is-tablet-viewer']
    }
  };
  
  console.log('[DEBUG MOBILE] Mobile debug request:', debugInfo);
  
  return NextResponse.json({
    message: 'Mobile debug endpoint',
    debug: debugInfo
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const debugInfo = {
      timestamp: new Date().toISOString(),
      body: body,
      headers: Object.fromEntries(req.headers.entries())
    };
    
    console.log('[DEBUG MOBILE POST] Mobile debug post request:', debugInfo);
    
    return NextResponse.json({
      message: 'Mobile debug POST endpoint',
      received: body,
      debug: debugInfo
    });
  } catch (error) {
    console.log('[DEBUG MOBILE POST] Error parsing body:', error);
    return NextResponse.json({
      message: 'Mobile debug POST endpoint - error parsing body',
      error: String(error)
    });
  }
}