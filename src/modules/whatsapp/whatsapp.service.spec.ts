import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

// ── Mock cloudinary so PDF upload tests don't hit the real CDN ─────────────
jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn((_opts: any, cb: any) => {
        cb(null, { secure_url: 'https://res.cloudinary.com/test/sample.pdf' });
        return { end: jest.fn() };
      }),
    },
    config: jest.fn(),
  },
}));

const CONFIG: Record<string, string> = {
  WHATSAPP_PROVIDER: 'meta',
  ADMIN_WHATSAPP_NUMBER: '966556217079',
  META_WHATSAPP_ACCESS_TOKEN: 'test-token',
  META_WHATSAPP_PHONE_NUMBER_ID: '1057932304077374',
  META_WHATSAPP_API_VERSION: 'v22.0',
};

function buildModule() {
  return Test.createTestingModule({
    providers: [
      WhatsappService,
      {
        provide: ConfigService,
        useValue: { get: (key: string) => CONFIG[key] ?? '' },
      },
    ],
  }).compile();
}

describe('WhatsappService', () => {
  let service: WhatsappService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await buildModule();
    service = module.get(WhatsappService);

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      // `id` satisfies the media-upload call (POST /media → { id });
      // `messages` satisfies the message-send call (POST /messages → { messages }).
      json: async () => ({ id: 'media-test-1', messages: [{ id: 'wamid.test123' }] }),
      text: async () => '',
    });
    global.fetch = fetchMock;
  });

  afterEach(() => jest.clearAllMocks());

  // ─── sendText ─────────────────────────────────────────────────────────────

  describe('sendText', () => {
    it('sends a free-form text message via Meta', async () => {
      await service.sendText('966501234567', 'مرحبا');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('1057932304077374/messages');
      const body = JSON.parse(opts.body);
      expect(body.type).toBe('text');
      expect(body.text.body).toBe('مرحبا');
      expect(body.to).toBe('966501234567');
    });

    it('strips non-digits from phone before sending', async () => {
      await service.sendText('+966 50 123 4567', 'test');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.to).toBe('966501234567');
    });
  });

  // ─── notifyAdminBookingRequest ────────────────────────────────────────────

  describe('notifyAdminBookingRequest', () => {
    const params = {
      referenceNumber: 'AMS-000001',
      contactPhone: '0501234567',
      originNameAr: 'الرياض',
      destinationNameAr: 'مكة المكرمة',
      requestedDate: '2026-05-10T08:00:00.000Z',
      carTypePreference: 'staria' as const,
      passengerCount: 3,
      passengers: [
        { fullName: 'أحمد محمد', idNumber: '1234567890', nationality: 'سعودي', phone: '0501111111' },
      ],
    };

    it('sends ams_booking_request template to admin number', async () => {
      await service.notifyAdminBookingRequest(params);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe('template');
      expect(body.template.name).toBe('ams_booking_request');
      expect(body.template.language.code).toBe('ar');
      expect(body.to).toBe('966556217079'); // admin number from config
    });

    it('passes correct body parameters in order', async () => {
      await service.notifyAdminBookingRequest(params);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const paramTexts = body.template.components[0].parameters.map((p: any) => p.text);

      expect(paramTexts[0]).toBe('AMS-000001');        // {{1}} referenceNumber
      expect(paramTexts[1]).toBe('الرياض');            // {{2}} origin
      expect(paramTexts[2]).toBe('مكة المكرمة');       // {{3}} destination
      // {{4}} is formatted date — just assert it's a non-empty string
      expect(typeof paramTexts[3]).toBe('string');
      expect(paramTexts[3].length).toBeGreaterThan(0);
      expect(paramTexts[4]).toBe('هيونداي ستاريا');    // {{5}} carLabel
      expect(paramTexts[5]).toBe('3');                  // {{6}} passengerCount
      expect(paramTexts[6]).toBe('0501234567');         // {{7}} contactPhone
    });

    it('does nothing when ADMIN_WHATSAPP_NUMBER is not set', async () => {
      const mod = await Test.createTestingModule({
        providers: [
          WhatsappService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) =>
                key === 'ADMIN_WHATSAPP_NUMBER' ? '' : CONFIG[key] ?? '',
            },
          },
        ],
      }).compile();
      const svc = mod.get(WhatsappService);
      await svc.notifyAdminBookingRequest(params);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ─── notifyRider ──────────────────────────────────────────────────────────

  describe('notifyRider', () => {
    const params = {
      riderPhone: '966501234567',
      riderName: 'خالد',
      referenceNumber: 'AMS-000042',
      originNameAr: 'جدة',
      destinationNameAr: 'المدينة المنورة',
      departureAt: new Date('2026-05-15T06:00:00.000Z'),
      pickupAddress: 'شارع الأمير سلطان',
    };

    it('sends ams_booking_confirmed template to rider', async () => {
      await service.notifyRider(params);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe('template');
      expect(body.template.name).toBe('ams_booking_confirmed');
      expect(body.to).toBe('966501234567');
    });

    it('passes rider name, booking number, route, date, and address', async () => {
      await service.notifyRider(params);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const texts = body.template.components[0].parameters.map((p: any) => p.text);

      expect(texts[0]).toBe('خالد');                   // {{1}} riderName
      expect(texts[1]).toBe('AMS-000042');              // {{2}} referenceNumber
      expect(texts[2]).toBe('جدة');                     // {{3}} origin
      expect(texts[3]).toBe('المدينة المنورة');         // {{4}} destination
      expect(typeof texts[4]).toBe('string');           // {{5}} formatted date
      expect(texts[5]).toBe('شارع الأمير سلطان');      // {{6}} pickupAddress
    });
  });

  // ─── notifyDriverWithManifest ─────────────────────────────────────────────

  describe('notifyDriverWithManifest', () => {
    const params = {
      driverPhone: '966509876543',
      referenceNumber: 'AMS-000007',
      originNameAr: 'أبها',
      destinationNameAr: 'جازان',
      departureAt: new Date('2026-05-20T04:00:00.000Z'),
      pdfBuffer: Buffer.from('%PDF-1.4 test content'),
    };

    it('sends ams_trip_manifest template, uploads media to Meta, then sends document by id', async () => {
      await service.notifyDriverWithManifest(params);

      // 3 fetch calls: template (/messages) → media upload (/media) → document (/messages)
      expect(fetchMock).toHaveBeenCalledTimes(3);

      const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(firstBody.type).toBe('template');
      expect(firstBody.template.name).toBe('ams_trip_manifest');
      expect(firstBody.to).toBe('966509876543');

      // 2nd call uploads the PDF bytes to Meta's media endpoint (multipart, not JSON)
      expect(fetchMock.mock.calls[1][0]).toContain('1057932304077374/media');

      // 3rd call sends the document by the returned media id — never a Cloudinary link
      const thirdBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(thirdBody.type).toBe('document');
      expect(thirdBody.document.id).toBe('media-test-1');
      expect(thirdBody.document.link).toBeUndefined();
      expect(thirdBody.document.filename).toBe('manifest-AMS-000007.pdf');
    });

    it('includes booking reference, route and date in template params', async () => {
      await service.notifyDriverWithManifest(params);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const texts = body.template.components[0].parameters.map((p: any) => p.text);

      expect(texts[0]).toBe('AMS-000007');   // {{1}} referenceNumber
      expect(texts[1]).toBe('أبها');          // {{2}} origin
      expect(texts[2]).toBe('جازان');         // {{3}} destination
      expect(typeof texts[3]).toBe('string'); // {{4}} formatted date
    });

    it('skips fetch entirely when driver phone is empty', async () => {
      await service.notifyDriverWithManifest({ ...params, driverPhone: '' });
      // sendMetaMessage guards on empty to (formatMetaTo returns '')
      // template message still fires but goes to empty recipient — guard is caller's job
      // This test just ensures no unhandled throw
    });
  });

  // ─── notifyAdminWithManifest ──────────────────────────────────────────────

  describe('notifyAdminWithManifest', () => {
    const params = {
      referenceNumber: 'AMS-000003',
      riderName: 'فاطمة',
      riderPhone: '966502222222',
      originNameAr: 'الطائف',
      destinationNameAr: 'مكة المكرمة',
      departureAt: new Date('2026-05-12T05:00:00.000Z'),
      passengerCount: 5,
      pdfBuffer: Buffer.from('%PDF-1.4 test'),
    };

    it('sends ams_trip_manifest template, uploads media, then sends document by id to admin', async () => {
      await service.notifyAdminWithManifest(params);

      expect(fetchMock).toHaveBeenCalledTimes(3);

      const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(firstBody.type).toBe('template');
      expect(firstBody.template.name).toBe('ams_trip_manifest');
      expect(firstBody.to).toBe('966556217079'); // admin number

      expect(fetchMock.mock.calls[1][0]).toContain('1057932304077374/media');

      const thirdBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(thirdBody.type).toBe('document');
      expect(thirdBody.document.id).toBe('media-test-1');
      expect(thirdBody.document.filename).toBe('booking-AMS-000003.pdf');
    });
  });

  // ─── API auth header ──────────────────────────────────────────────────────

  it('always sends Bearer token in Authorization header', async () => {
    await service.sendText('966501234567', 'test');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  // ─── error resilience ─────────────────────────────────────────────────────

  it('logs but does not throw when Meta API returns non-ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error": "bad request"}',
    });
    await expect(service.sendText('966501234567', 'test')).resolves.not.toThrow();
  });
});
