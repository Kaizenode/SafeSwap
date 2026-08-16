import type { NextRequest } from 'next/server';
import { getSession } from '../../../../lib/auth/session.ts';

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export async function GET(request: Request | NextRequest) {
  const session = await getSession(request);

  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { supabase } = await import('../../../../lib/supabase.ts');
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('address', session.address)
      .maybeSingle();

    if (error || !user) {
      return jsonResponse({
        address: session.address,
        preferred_mode: null,
        display_name: null,
      });
    }

    return jsonResponse(user);
  } catch {
    return jsonResponse({
      address: session.address,
      preferred_mode: null,
      display_name: null,
    });
  }
}
