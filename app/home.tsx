import { scale } from '../utils/responsive';
import { useAuth } from '@clerk/clerk-expo';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: W, height: VH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const MAX_W = 1140;

/* ── Brand colours ── */
const C = {
  teal: '#2EC4B6', tealDk: '#0F9D8A', navy: '#1B3A3A',
  blue: '#2563EB', orange: '#D97706', green: '#16A34A',
  bg: '#F0F4F8', bg2: '#E8EFF5', white: '#FFFFFF',
  gray: '#64748B', border: '#E2E8F0', text: '#1E293B',
};

/* ── Static data ── */
const FEATURES = [
  { icon: 'assignment' as const, color: C.teal, bg: '#E8FFF9', title: 'Order Management', desc: 'Track every order from placement to doorstep delivery. Approve, assign, and review order breakdowns instantly.' },
  { icon: 'badge' as const, color: C.blue, bg: '#DBEAFE', title: 'Staff Management', desc: 'Invite delivery staff via email, manage team members, and view performance analytics.' },
  { icon: 'payments' as const, color: C.orange, bg: '#FEF3C7', title: 'Pricing Control', desc: 'Update water can price (₹35), container deposits (₹200), and express charges live — no delays.' },
  { icon: 'timeline' as const, color: C.teal, bg: '#E8FFF9', title: 'Real-Time Tracking', desc: 'Monitor order status live: Pending → Assigned → Out for Delivery → Delivered, across all devices.' },
  { icon: 'phone-android' as const, color: C.green, bg: '#DCFCE7', title: 'Mobile First', desc: 'Built natively for Android and iOS. Your team, staff, and customers — all on one platform.' },
  { icon: 'lock' as const, color: C.tealDk, bg: '#CCFBF1', title: 'OTP-Verified Delivery', desc: 'Staff enter a 4-digit customer OTP before marking delivered — ensuring verified, secure handoffs.' },
];
const STEPS = [
  { num: '01', color: C.teal, icon: 'assignment' as const, title: 'Order Received', desc: 'Customer places a water can order via the mobile app. Admin sees it instantly as Pending.' },
  { num: '02', color: C.blue, icon: 'person' as const, title: 'Staff Assigned', desc: 'Admin approves, assigns to an available delivery staff member from the dashboard.' },
  { num: '03', color: C.orange, icon: 'local-shipping' as const, title: 'Out for Delivery', desc: 'Staff accepts, picks up the cans, and navigates to the customer address. Status updates live.' },
  { num: '04', color: C.green, icon: 'verified' as const, title: 'Order Completed', desc: 'Staff enters the customer\'s 4-digit OTP. Order marked Delivered — admin sees it instantly.' },
];
const STATS_DATA = [
  { num: 69, label: 'Total Orders', desc: 'All time system orders', color: C.teal, pct: 0.69, iconName: 'receipt-long' as const, bg: '#E8FFF9' },
  { num: 4, label: 'Pending Orders', desc: 'Awaiting admin approval', color: C.orange, pct: 0.20, iconName: 'schedule' as const, bg: '#FEF3C7' },
  { num: 12, label: 'Active Deliveries', desc: 'Out for delivery now', color: C.blue, pct: 0.55, iconName: 'local-shipping' as const, bg: '#DBEAFE' },
  { num: 6, label: 'Completed Orders', desc: 'Successfully delivered', color: C.green, pct: 0.30, iconName: 'check-circle' as const, bg: '#DCFCE7' },
];
const PRICING = [
  {
    icon: 'tint' as const, iconLib: 'fa5', color: C.teal, iBg: '#E8FFF9', borderColor: C.teal,
    badge: 'Most Popular', title: 'Water Can (20L)', symbol: '₹', amount: '35',
    desc: 'Per 20-litre can of purified water delivered to your doorstep.',
    features: ['20-litre purified water', 'OTP-verified delivery', 'Cash on delivery (COD)', 'Online payment accepted'],
  },
  {
    icon: 'inventory' as const, iconLib: 'mi', color: C.blue, iBg: '#EFF6FF', borderColor: '#BFDBFE',
    badge: '', title: 'Empty Can Deposit', symbol: '₹', amount: '200',
    desc: 'Refundable deposit for new containers. Returned when empty can is handed back.',
    features: ['Fully refundable', 'First-time order only', 'Per can basis'],
  },
];

/* ══════════════════════════════════════════
   ANIMATION HELPERS
══════════════════════════════════════════ */

/** Per-section Animated.Value: 0 → 1 drives all children via interpolation stagger */
function useSectionDriver() {
  return useRef(new Animated.Value(0)).current;
}

function runSectionIn(driver: Animated.Value) {
  Animated.timing(driver, {
    toValue: 1, duration: 700,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();
}

/** Returns animated style for child `idx` of `total` in a section driven by `driver` */
function childStyle(driver: Animated.Value, idx: number, total: number, fromY = 24) {
  const start = idx / (total + 1);
  const end = (idx + 1) / (total + 1);
  return {
    opacity: driver.interpolate({ inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateY: driver.interpolate({ inputRange: [start, end], outputRange: [fromY, 0], extrapolate: 'clamp' }) }],
  };
}

/* ── WavyLine ── */
function WavyLine({ color = C.orange }: { color?: string }) {
  return (
    <View style={s.wavyWrap}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[s.wavyArc, { borderColor: color, marginLeft: i === 0 ? 0 : -6 }]} />
      ))}
    </View>
  );
}

/* ── Count-up ── */
function CountUp({ target, style, triggered }: { target: number; style?: any; triggered: boolean }) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!triggered || done.current) return;
    done.current = true;
    let cur = 0;
    const step = target / 55;
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setV(target); clearInterval(t); return; }
      setV(Math.floor(cur));
    }, 18);
    return () => clearInterval(t);
  }, [triggered]);
  return <Text style={style}>{v}</Text>;
}

/* ── AnimatedBar ── */
function AnimatedBar({ pct, color, triggered }: { pct: number; color: string; triggered: boolean }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!triggered) return;
    Animated.timing(w, { toValue: pct, duration: 1000, delay: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [triggered]);
  return (
    <View style={s.statBarTrack}>
      <Animated.View style={[s.statBarFill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '85%'] }) }]} />
    </View>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function HomeScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  /* ── Hero entrance ── */
  const heroO = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(28)).current;
  const heroPY = useRef(new Animated.Value(40)).current; // phone from bottom
  const heroPO = useRef(new Animated.Value(0)).current;

  /* ── Phone float loop ── */
  const phoneFloat = useRef(new Animated.Value(0)).current;

  /* ── Badge pulse ring ── */
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseO = useRef(new Animated.Value(0.6)).current;

  /* ── Section drivers (one per section) ── */
  const dStats = useSectionDriver();
  const dFeatures = useSectionDriver();
  const dHow = useSectionDriver();
  const dPricing = useSectionDriver();
  const dContact = useSectionDriver();

  /* ── Triggered flags ── */
  const [statsOn, setStatsOn] = useState(false);
  const [featOn, setFeatOn] = useState(false);
  const [howOn, setHowOn] = useState(false);
  const [priceOn, setPriceOn] = useState(false);
  const [contactOn, setContactOn] = useState(false);

  /* ── Section layout Y positions ── */
  const layouts = useRef({ stats: 0, features: 0, how: 0, pricing: 0, contact: 0 });
  const scrollRef = useRef(0);
  const viewH = useRef(VH);

  /* ── Initial launch ── */
  useEffect(() => {
    // Hero content
    Animated.parallel([
      Animated.timing(heroO, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(heroY, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    // Phone mockup (delayed)
    Animated.parallel([
      Animated.timing(heroPO, { toValue: 1, duration: 700, delay: 300, useNativeDriver: true }),
      Animated.timing(heroPY, { toValue: 0, duration: 700, delay: 300, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
    ]).start(() => {
      // Start float loop after entrance
      Animated.loop(
        Animated.sequence([
          Animated.timing(phoneFloat, { toValue: -14, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(phoneFloat, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });
    // Badge pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 2.2, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseO, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseO, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(800),
      ])
    ).start();
  }, []);

  /* ── Scroll trigger ── */
  const checkVisible = useCallback((scrollY: number) => {
    const trigger = scrollY + viewH.current * 0.82;
    if (!statsOn && layouts.current.stats > 0 && trigger > layouts.current.stats) { setStatsOn(true); runSectionIn(dStats); }
    if (!featOn && layouts.current.features > 0 && trigger > layouts.current.features) { setFeatOn(true); runSectionIn(dFeatures); }
    if (!howOn && layouts.current.how > 0 && trigger > layouts.current.how) { setHowOn(true); runSectionIn(dHow); }
    if (!priceOn && layouts.current.pricing > 0 && trigger > layouts.current.pricing) { setPriceOn(true); runSectionIn(dPricing); }
    if (!contactOn && layouts.current.contact > 0 && trigger > layouts.current.contact) { setContactOn(true); runSectionIn(dContact); }
  }, [statsOn, featOn, howOn, priceOn, contactOn]);

  const handleLayout = (e: any) => { viewH.current = e.nativeEvent.layout.height; };
  const handleScroll = (e: any) => {
    scrollRef.current = e.nativeEvent.contentOffset.y;
    checkVisible(scrollRef.current);
  };

  const goToSignIn = () => router.push('/sign-in' as any);
  const goToDashboard = () => { if (router.canGoBack()) router.back(); else router.replace('/' as any); };
  const primary = isSignedIn ? goToDashboard : goToSignIn;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ══ NAVBAR ══ */}
      <View style={s.navbar}>
        <View style={s.navInner}>
          <View style={s.navLogo}>
            <View style={s.navLogoIcon}>
              <FontAwesome5 name="tint" size={scale(14)} color="#fff" />
            </View>
            <View>
              <Text style={s.navBrand}>HydroMate</Text>
              <Text style={s.navTagline}>PURE CARE. PURE HYDRATION.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={isSignedIn ? s.dashBtn : s.loginBtn}
            onPress={isSignedIn ? goToDashboard : goToSignIn}
            id="home-nav-action"
          >
            <MaterialIcons name={isSignedIn ? 'dashboard' : 'login'} size={scale(15)} color={isSignedIn ? '#fff' : C.tealDk} />
            <Text style={isSignedIn ? s.dashBtnText : s.loginBtnText}>{isSignedIn ? 'Dashboard' : 'Login'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={handleLayout}
      >
        {/* ══ HERO ══ */}
        <View style={s.hero}>
          <View style={s.heroBlob1} />
          <View style={s.heroBlob2} />

          {/* Content */}
          <Animated.View style={[s.heroContent, { opacity: heroO, transform: [{ translateY: heroY }] }]}>
            {/* Badge with pulse ring */}
            <View style={s.heroBadge}>
              <View style={s.badgeCenter}>
                <Animated.View style={[s.pulseDot, { transform: [{ scale: pulseScale }], opacity: pulseO }]} />
                <View style={s.badgeDot} />
              </View>
              <Text style={s.heroBadgeText}>Understand the importance of hydration</Text>
            </View>

            <Text style={s.heroTitle}>
              Smart &amp; Reliable{'\n'}
              <Text style={s.heroAccent}>Water Delivery{'\n'}</Text>
              Management
            </Text>

            <Text style={s.heroSub}>
              HydroMate gives you full control over water can delivery — track orders in real time, manage your delivery team, and set prices with ease. Built for water businesses in{' '}
              <Text style={{ fontWeight: '900', color: C.navy }}>Tirunelveli</Text>.
            </Text>

            {/* Stats row */}
            <View style={s.heroStats}>
              {[
                { n: 69, l: 'ORDERS MANAGED' },
                { n: 12, l: 'ACTIVE DELIVERIES' },
                { n: 4, l: 'PENDING ORDERS' },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={s.heroStatDiv} />}
                  <View style={s.heroStatItem}>
                    <CountUp target={item.n} style={s.heroStatNum} triggered={true} />
                    <Text style={s.heroStatLabel}>{item.l}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* CTAs */}
            <View style={s.ctaRow}>
              <TouchableOpacity style={s.ctaPrimary} onPress={primary} id="home-cta-primary">
                <MaterialIcons name={isSignedIn ? 'arrow-back' : 'arrow-forward'} size={scale(18)} color="#fff" />
                <Text style={s.ctaPrimaryText}>{isSignedIn ? 'Back to Dashboard' : 'Get Started Free'}</Text>
              </TouchableOpacity>
              {!isSignedIn && (
                <TouchableOpacity style={s.ctaGhost} onPress={goToSignIn} id="home-cta-ghost">
                  <MaterialIcons name="play-circle-outline" size={scale(17)} color={C.navy} />
                  <Text style={s.ctaGhostText}>See How It Works</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Trust */}
            <View style={s.trustRow}>
              {['Real-time tracking', 'OTP-verified delivery', 'Role-based access'].map((t, i) => (
                <View key={i} style={s.trustItem}>
                  <MaterialIcons name="check-circle" size={13} color={C.teal} />
                  <Text style={s.trustText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Phone mockup (wide screens) */}
          {IS_WEB && W > 900 && (
            <Animated.View style={[s.phoneMockup, { opacity: heroPO, transform: [{ translateY: Animated.add(heroPY, phoneFloat) }] }]}>
              <PhoneMockup />
              {/* Float chips */}
              <View style={[s.floatChip, s.chipTop]}>
                <MaterialIcons name="check-circle" size={13} color={C.green} />
                <Text style={s.floatChipText}>Order Delivered!</Text>
              </View>
              <View style={[s.floatChip, s.chipBottom]}>
                <MaterialIcons name="local-shipping" size={13} color={C.blue} />
                <Text style={s.floatChipText}>12 Active Deliveries</Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* ══ STATS BAND ══ */}
        <View style={s.statsBand} onLayout={e => { layouts.current.stats = e.nativeEvent.layout.y; }}>
          <View style={s.inner}>
            <View style={s.statsGrid}>
              {STATS_DATA.map((stat, i) => (
                <Animated.View key={i} style={[s.statCard, childStyle(dStats, i, STATS_DATA.length, 20)]}>
                  <View style={[s.statIconBox, { backgroundColor: stat.bg }]}>
                    <MaterialIcons name={stat.iconName} size={24} color={stat.color} />
                  </View>
                  <CountUp target={stat.num} style={[s.statNum, { color: stat.color }]} triggered={statsOn} />
                  <Text style={s.statLabel}>{stat.label}</Text>
                  <Text style={s.statDesc}>{stat.desc}</Text>
                  <AnimatedBar pct={stat.pct} color={stat.color} triggered={statsOn} />
                </Animated.View>
              ))}
            </View>
          </View>
        </View>

        {/* ══ FEATURES ══ */}
        <View style={s.featSection} onLayout={e => { layouts.current.features = e.nativeEvent.layout.y; }}>
          <View style={s.inner}>
            {/* Section header animates as child 0 */}
            <Animated.View style={childStyle(dFeatures, 0, FEATURES.length + 1)}>
              <View style={s.eyebrowWrap}><Text style={s.eyebrowText}>WHAT'S INCLUDED</Text></View>
              <Text style={s.sectionTitle}>Maximum Purity of Control</Text>
              <WavyLine color={C.teal} />
            </Animated.View>

            <View style={s.featGrid}>
              {FEATURES.map((f, i) => (
                <Animated.View key={i} style={[
                  s.featCard,
                  i === 5 && s.featCardHL,
                  childStyle(dFeatures, i + 1, FEATURES.length + 1),
                ]}>
                  <View style={[s.featIcon, { backgroundColor: i === 5 ? 'rgba(255,255,255,0.18)' : f.bg }]}>
                    <MaterialIcons name={f.icon} size={28} color={i === 5 ? '#fff' : f.color} />
                  </View>
                  <Text style={[s.featTitle, i === 5 && { color: '#fff' }]}>{f.title}</Text>
                  <Text style={[s.featDesc, i === 5 && { color: 'rgba(255,255,255,0.85)' }]}>{f.desc}</Text>
                  <Text style={[s.readMore, i === 5 && { color: 'rgba(255,255,255,0.7)' }]}>Read More →</Text>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>

        {/* ══ HOW IT WORKS ══ */}
        <View style={s.howSection} onLayout={e => { layouts.current.how = e.nativeEvent.layout.y; }}>
          <View style={s.inner}>
            <Animated.View style={[{ alignItems: 'center' }, childStyle(dHow, 0, STEPS.length + 1)]}>
              <View style={s.eyebrowWrap}><Text style={s.eyebrowText}>THE WORKFLOW</Text></View>
              <Text style={[s.sectionTitle, { textAlign: 'center' }]}>How HydroMate Works</Text>
              <WavyLine />
              <Text style={s.sectionSub}>A simple, end-to-end delivery flow from order to doorstep</Text>
            </Animated.View>

            <View style={s.stepsWrap}>
              {STEPS.map((step, i) => (
                <Animated.View key={i} style={[s.stepRow, childStyle(dHow, i + 1, STEPS.length + 1, 0)]}>
                  <View style={s.stepLeft}>
                    <View style={[s.stepCircle, { backgroundColor: step.color }]}>
                      <Text style={s.stepCircleText}>{step.num}</Text>
                    </View>
                    {i < STEPS.length - 1 && <View style={[s.stepLine, { backgroundColor: step.color + '40' }]} />}
                  </View>
                  <View style={s.stepBody}>
                    <View style={[s.stepIconWrap, { backgroundColor: step.color + '18' }]}>
                      <MaterialIcons name={step.icon} size={24} color={step.color} />
                    </View>
                    <View style={s.stepText}>
                      <Text style={s.stepTitle}>{step.title}</Text>
                      <Text style={s.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>

        {/* ══ PRICING ══ */}
        <View style={s.pricingSection} onLayout={e => { layouts.current.pricing = e.nativeEvent.layout.y; }}>
          <View style={s.inner}>
            <Animated.View style={[{ alignItems: 'center' }, childStyle(dPricing, 0, 4)]}>
              <View style={s.eyebrowWrap}><Text style={s.eyebrowText}>TRANSPARENT PRICING</Text></View>
              <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Know Exactly What Customers Pay</Text>
              <WavyLine color={C.teal} />
              <Text style={s.sectionSub}>No hidden charges — just pure, simple pricing</Text>
            </Animated.View>

            <View style={s.pricingGrid}>
              {PRICING.map((p, i) => (
                <Animated.View key={i} style={[s.priceCard, { borderColor: p.borderColor }, childStyle(dPricing, i + 1, 4, 16)]}>
                  {p.badge ? (
                    <View style={s.priceBadge}><Text style={s.priceBadgeText}>{p.badge}</Text></View>
                  ) : null}
                  <View style={[s.priceIconWrap, { backgroundColor: p.iBg }]}>
                    {p.iconLib === 'fa5'
                      ? <FontAwesome5 name={p.icon as any} size={28} color={p.color} />
                      : <MaterialIcons name={p.icon as any} size={28} color={p.color} />}
                  </View>
                  <Text style={s.priceTitle}>{p.title}</Text>
                  <Text style={[s.priceAmount, { color: p.color }]}>
                    {p.symbol}<Text style={[s.priceBig, { color: p.color }]}>{p.amount}</Text>
                  </Text>
                  <Text style={s.priceDesc}>{p.desc}</Text>
                  {p.features.map((f, fi) => (
                    <Text key={fi} style={s.priceFeature}>✅  {f}</Text>
                  ))}
                </Animated.View>
              ))}

              {/* Example card */}
              <Animated.View style={[s.priceCard, { borderColor: C.border }, childStyle(dPricing, 3, 4, 16)]}>
                <View style={s.exHeader}>
                  <MaterialIcons name="check-circle" size={16} color={C.tealDk} />
                  <Text style={s.exHeaderText}>REAL ORDER EXAMPLE</Text>
                </View>
                {[{ l: '1 × Water Can (20L)', v: '₹35' }, { l: 'Empty Can Deposit', v: '₹200' }].map((r, ri) => (
                  <View key={ri} style={s.exRow}>
                    <Text style={s.exLabel}>{r.l}</Text>
                    <Text style={s.exVal}>{r.v}</Text>
                  </View>
                ))}
                <View style={s.exDivider} />
                <View style={s.exTotalRow}>
                  <Text style={s.exTotalLabel}>Total Amount</Text>
                  <Text style={s.exTotalVal}>₹235</Text>
                </View>
                <Text style={s.exNote}>Based on Order #41480 — Sakthima, Tirunelveli</Text>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* ══ CONTACT ══ */}
        <View style={s.contactSection} onLayout={e => { layouts.current.contact = e.nativeEvent.layout.y; }}>
          <View style={s.inner}>
            <View style={s.contactGrid}>
              <Animated.View style={[s.contactInfo, childStyle(dContact, 0, 2)]}>
                <Text style={s.contactTitle}>Contact Information</Text>
                <WavyLine />
                {[
                  { icon: 'call' as const, label: 'Call Us', val: '+91 96341 72580' },
                  { icon: 'email' as const, label: 'E-mail', val: 'admin@hydromate.in' },
                  { icon: 'schedule' as const, label: 'Working Hours', val: 'Daily 6 AM – 8 PM' },
                  { icon: 'location-on' as const, label: 'Service Area', val: 'Tirunelveli, Tamil Nadu' },
                ].map((item, i) => (
                  <View key={i} style={s.contactItem}>
                    <View style={s.contactIconWrap}>
                      <MaterialIcons name={item.icon} size={18} color={C.teal} />
                    </View>
                    <View>
                      <Text style={s.contactItemLabel}>{item.label}</Text>
                      <Text style={s.contactItemVal}>{item.val}</Text>
                    </View>
                  </View>
                ))}
              </Animated.View>

              <Animated.View style={[s.contactCta, childStyle(dContact, 1, 2)]}>
                <Text style={s.contactTitle}>Start Today</Text>
                <WavyLine color={C.teal} />
                <Text style={s.contactCtaDesc}>
                  Join HydroMate and transform how you manage your water delivery business. Real-time control, fully verified deliveries, and a happy team.
                </Text>
                <TouchableOpacity style={s.contactBtn} onPress={isSignedIn ? goToDashboard : goToSignIn} id="home-contact-cta">
                  <FontAwesome5 name="tint" size={14} color={C.tealDk} />
                  <Text style={s.contactBtnText}>{isSignedIn ? 'Go to Dashboard' : 'Launch HydroMate'}</Text>
                </TouchableOpacity>
                <View style={s.contactChips}>
                  {['Order Tracking', 'Staff Mgmt', 'Live Pricing'].map((t, i) => (
                    <View key={i} style={s.contactChip}><Text style={s.contactChipText}>{t}</Text></View>
                  ))}
                </View>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* ══ FOOTER ══ */}
        <View style={s.footer}>
          <Text style={s.footerText}>© 2026 HydroMate. All Rights Reserved. Tirunelveli, Tamil Nadu.</Text>
          <View style={s.footerLinks}>
            {['Terms & Condition', 'Privacy Policy', 'Contact'].map((t, i) => (
              <Text key={i} style={s.footerLink}>{t}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Phone Mockup (extracted for clarity) ── */
function PhoneMockup() {
  return (
    <View style={s.phoneFrame}>
      <View style={s.phoneNotch} />
      <View style={[s.appHeader]}>
        <View style={s.appHeaderLeft}>
          <View style={s.av}><Text style={s.avT}>A</Text></View>
          <View>
            <Text style={s.appBrand}>HydroMate</Text>
            <Text style={s.appRole}>ADMIN DASHBOARD</Text>
          </View>
        </View>
        <View style={s.bellWrap}>
          <MaterialIcons name="notifications-none" size={16} color="#fff" />
          <View style={s.bellDot} />
        </View>
      </View>
      <View style={s.phoneStats}>
        {[{ n: '69', l: 'TOTAL', c: C.navy }, { n: '4', l: 'PENDING', c: C.orange }, { n: '12', l: 'ACTIVE', c: C.blue }, { n: '6', l: 'DONE', c: C.green }]
          .map((st, i) => (
            <View key={i} style={s.phoneStatCard}>
              <Text style={[s.phoneStatNum, { color: st.c }]}>{st.n}</Text>
              <Text style={s.phoneStatLabel}>{st.l}</Text>
            </View>
          ))}
      </View>
      <Text style={s.phoneOrdersLabel}>RECENT ORDERS</Text>
      <View style={s.phoneOrderCard}>
        <View style={s.phoneOrderTop}>
          <Text style={s.phoneOrderId}>#41480 Sakthima</Text>
          <View style={[s.statusChip, { backgroundColor: '#FEF3C7' }]}><Text style={[s.statusText, { color: C.orange }]}>PENDING</Text></View>
        </View>
        <Text style={s.phoneOrderDetail}>1 × 20L Can · ₹235</Text>
        <Text style={s.phoneOrderAddr}>📍 Neru, North Street, Tirunelveli</Text>
        <View style={s.phoneActionRow}>
          <View style={s.phoneActionGhost}><Text style={s.phoneActionGhostText}>Assign</Text></View>
          <View style={s.phoneActionSolid}><Text style={s.phoneActionSolidText}>Approve</Text></View>
        </View>
      </View>
      <View style={s.phoneOrderCard}>
        <View style={s.phoneOrderTop}>
          <Text style={s.phoneOrderId}>#38291 Priya R.</Text>
          <View style={[s.statusChip, { backgroundColor: '#DBEAFE' }]}><Text style={[s.statusText, { color: C.blue }]}>OUT FOR DEL.</Text></View>
        </View>
        <Text style={s.phoneOrderDetail}>2 × 20L Can · ₹270</Text>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════
   STYLES
══════════════════════════════════════════ */
const COL3 = IS_WEB && W > 1024;
const COL2 = IS_WEB && W > 640;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  // ── Navbar ──
  navbar: {
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
    ...(IS_WEB ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  navInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(18), paddingVertical: scale(12),
    maxWidth: MAX_W, alignSelf: 'center', width: '100%',
  },
  navLogo: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  navLogoIcon: {
    width: scale(36), height: scale(36), borderRadius: scale(10),
    backgroundColor: C.tealDk, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.tealDk, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  navBrand: { fontSize: scale(16), fontWeight: '900', color: C.navy, letterSpacing: -0.3 },
  navTagline: { fontSize: scale(8), fontWeight: '700', color: C.gray, letterSpacing: 0.5, textTransform: 'uppercase' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    backgroundColor: C.white, paddingHorizontal: scale(14), paddingVertical: scale(8),
    borderRadius: scale(10), borderWidth: 2, borderColor: C.tealDk,
  },
  loginBtnText: { fontSize: scale(13), fontWeight: '800', color: C.tealDk },
  dashBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    backgroundColor: C.tealDk, paddingHorizontal: scale(14), paddingVertical: scale(8),
    borderRadius: scale(10),
    shadowColor: C.tealDk, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  dashBtnText: { fontSize: scale(13), fontWeight: '800', color: '#fff' },

  // ── Hero ──
  hero: {
    minHeight: IS_WEB ? 580 : undefined,
    backgroundColor: '#F0F6FF',
    paddingVertical: scale(48), paddingHorizontal: scale(20),
    flexDirection: IS_WEB && W > 900 ? 'row' : 'column',
    alignItems: IS_WEB && W > 900 ? 'center' : 'flex-start',
    justifyContent: 'center',
    gap: IS_WEB && W > 900 ? 60 : 0,
    overflow: 'hidden', position: 'relative',
  },
  heroBlob1: { position: 'absolute', top: -100, right: -80, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(46,196,182,0.09)' },
  heroBlob2: { position: 'absolute', bottom: -80, left: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(37,99,235,0.07)' },
  heroContent: {
    flex: IS_WEB && W > 900 ? 1 : undefined,
    width: IS_WEB && W > 900 ? undefined : '100%',
    maxWidth: 580,
    flexShrink: 1,
  },

  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    backgroundColor: 'rgba(46,196,182,0.1)', borderWidth: 1, borderColor: 'rgba(46,196,182,0.25)',
    paddingHorizontal: scale(14), paddingVertical: scale(6),
    borderRadius: 100, alignSelf: 'flex-start', marginBottom: scale(20),
  },
  badgeCenter: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal, position: 'absolute' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal, position: 'absolute' },
  heroBadgeText: { fontSize: scale(12), fontWeight: '700', color: C.tealDk },

  heroTitle: {
    fontSize: IS_WEB ? 50 : scale(28), fontWeight: '900', color: C.navy,
    lineHeight: IS_WEB ? 60 : scale(36), marginBottom: scale(16), letterSpacing: -0.5,
    fontFamily: Platform.select({ web: 'Georgia, serif', default: undefined }),
  },
  heroAccent: { color: C.teal },
  heroSub: {
    fontSize: scale(14), color: C.gray, lineHeight: scale(22),
    marginBottom: scale(24), fontWeight: '500', maxWidth: 500,
  },
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: scale(14), padding: scale(4),
    borderWidth: 1, borderColor: C.border, marginBottom: scale(24),
    alignSelf: IS_WEB ? 'flex-start' : 'stretch',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  heroStatItem: { flex: 1, alignItems: 'center', paddingHorizontal: scale(8), paddingVertical: scale(12) },
  heroStatNum: { fontSize: IS_WEB ? 28 : scale(20), fontWeight: '900', color: C.tealDk },
  heroStatLabel: { fontSize: scale(8), fontWeight: '700', color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2, textAlign: 'center' },
  heroStatDiv: { width: 1, height: 36, backgroundColor: C.border },

  ctaRow: { flexDirection: 'row', gap: scale(12), marginBottom: scale(20), flexWrap: 'wrap' },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    backgroundColor: C.tealDk, paddingHorizontal: IS_WEB ? 28 : scale(20), paddingVertical: IS_WEB ? 14 : scale(14),
    borderRadius: scale(10),
    shadowColor: C.tealDk, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  ctaPrimaryText: { fontSize: IS_WEB ? 16 : scale(14), fontWeight: '900', color: '#fff' },
  ctaGhost: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    backgroundColor: C.white, paddingHorizontal: IS_WEB ? 24 : scale(18), paddingVertical: IS_WEB ? 14 : scale(14),
    borderRadius: scale(10), borderWidth: 2, borderColor: C.border,
  },
  ctaGhostText: { fontSize: IS_WEB ? 16 : scale(14), fontWeight: '800', color: C.navy },

  trustRow: { flexDirection: 'row', gap: scale(14), flexWrap: 'wrap' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
  trustText: { fontSize: scale(12), color: C.gray, fontWeight: '600' },

  // Phone mockup
  phoneMockup: { flexShrink: 0, position: 'relative', width: 290, alignItems: 'center' },
  phoneFrame: {
    width: 268, borderRadius: 36, overflow: 'hidden', backgroundColor: C.white,
    borderWidth: 8, borderColor: C.navy,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 40, elevation: 16,
  },
  phoneNotch: { width: 80, height: 18, backgroundColor: C.navy, alignSelf: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  appHeader: { backgroundColor: C.tealDk, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  av: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avT: { fontSize: 13, fontWeight: '900', color: '#fff' },
  appBrand: { fontSize: 11, fontWeight: '900', color: '#fff' },
  appRole: { fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.4 },
  bellWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: C.tealDk },
  phoneStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8 },
  phoneStatCard: { width: '46%', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  phoneStatNum: { fontSize: 18, fontWeight: '900' },
  phoneStatLabel: { fontSize: 7, fontWeight: '800', color: C.gray, textTransform: 'uppercase', letterSpacing: 0.3 },
  phoneOrdersLabel: { fontSize: 8, fontWeight: '800', color: C.gray, letterSpacing: 0.8, paddingHorizontal: 10, paddingBottom: 4, textTransform: 'uppercase' },
  phoneOrderCard: { marginHorizontal: 8, marginBottom: 7, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  phoneOrderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  phoneOrderId: { fontSize: 9, fontWeight: '800', color: C.navy },
  statusChip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  statusText: { fontSize: 7, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  phoneOrderDetail: { fontSize: 9, color: C.gray },
  phoneOrderAddr: { fontSize: 8, color: '#94A3B8', marginTop: 1 },
  phoneActionRow: { flexDirection: 'row', gap: 5, marginTop: 7 },
  phoneActionGhost: { flex: 1, padding: 5, borderRadius: 6, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center' },
  phoneActionGhostText: { fontSize: 8, fontWeight: '800', color: C.gray },
  phoneActionSolid: { flex: 1, padding: 5, borderRadius: 6, backgroundColor: C.tealDk, alignItems: 'center' },
  phoneActionSolidText: { fontSize: 8, fontWeight: '800', color: '#fff' },

  floatChip: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 7,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 6,
  },
  chipTop: { top: 60, right: -24 },
  chipBottom: { bottom: 80, left: -24 },
  floatChipText: { fontSize: 11, fontWeight: '700', color: C.navy },

  // ── Common section helpers ──
  inner: { maxWidth: MAX_W, alignSelf: 'center', width: '100%', paddingHorizontal: scale(20) },
  eyebrowWrap: {
    backgroundColor: 'rgba(46,196,182,0.1)', paddingHorizontal: scale(12), paddingVertical: scale(5),
    borderRadius: 100, alignSelf: 'flex-start', marginBottom: scale(10),
  },
  eyebrowText: { fontSize: scale(10), fontWeight: '800', color: C.teal, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitle: {
    fontSize: IS_WEB ? 40 : scale(24), fontWeight: '900', color: C.navy, marginBottom: scale(10),
    fontFamily: Platform.select({ web: 'Georgia, serif', default: undefined }),
  },
  wavyWrap: { flexDirection: 'row', marginBottom: scale(22), marginTop: 2 },
  wavyArc: { width: 16, height: 10, borderRadius: 8, borderWidth: 2.5, borderTopColor: 'transparent', transform: [{ scaleX: -1 }] },
  sectionSub: { fontSize: scale(14), color: C.gray, textAlign: 'center', lineHeight: scale(22), marginBottom: scale(36) },

  // ── Stats band ──
  statsBand: { backgroundColor: C.bg, paddingVertical: scale(64) },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(16) },
  statCard: {
    flex: IS_WEB ? 1 : undefined, minWidth: IS_WEB ? 200 : undefined,
    width: IS_WEB ? undefined : '47%',
    backgroundColor: C.white, borderRadius: scale(18), padding: scale(20), alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    marginBottom: IS_WEB ? 0 : scale(12),
  },
  statIconBox: { width: scale(50), height: scale(50), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center', marginBottom: scale(12) },
  statNum: { fontSize: IS_WEB ? 44 : scale(32), fontWeight: '900', lineHeight: IS_WEB ? 48 : scale(36) },
  statLabel: { fontSize: scale(13), fontWeight: '800', color: C.navy, marginTop: 4, textAlign: 'center' },
  statDesc: { fontSize: scale(11), color: C.gray, textAlign: 'center', marginTop: 3, marginBottom: scale(14) },
  statBarTrack: { height: 4, width: '80%', backgroundColor: C.bg2, borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: 4, borderRadius: 2 },

  // ── Features ──
  featSection: { backgroundColor: '#EBF0F6', paddingVertical: scale(72) },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(16) },
  featCard: {
    backgroundColor: C.white, borderRadius: scale(18), padding: scale(24),
    borderWidth: 1, borderColor: C.border,
    flex: COL3 ? 1 : undefined,
    minWidth: COL3 ? 280 : COL2 ? '45%' : '100%',
    maxWidth: COL3 ? '31%' : COL2 ? '48%' : '100%',
    marginBottom: COL3 ? 0 : scale(12),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  featCardHL: { backgroundColor: C.tealDk, borderWidth: 0, shadowColor: C.tealDk, shadowOpacity: 0.2, shadowRadius: 16 },
  featIcon: { width: scale(56), height: scale(56), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center', marginBottom: scale(16) },
  featTitle: { fontSize: scale(16), fontWeight: '800', color: C.navy, marginBottom: scale(8) },
  featDesc: { fontSize: scale(13), color: C.gray, lineHeight: scale(20), marginBottom: scale(12) },
  readMore: { fontSize: scale(12), fontWeight: '700', color: C.orange },

  // ── How it works ──
  howSection: { backgroundColor: C.bg, paddingVertical: scale(72) },
  stepsWrap: { maxWidth: 800, alignSelf: 'center', width: '100%', marginTop: scale(16) },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(12) },
  stepLeft: { alignItems: 'center', width: scale(52) },
  stepCircle: { width: scale(46), height: scale(46), borderRadius: scale(23), alignItems: 'center', justifyContent: 'center' },
  stepCircleText: { fontSize: scale(13), fontWeight: '900', color: '#fff' },
  stepLine: { width: 2, flex: 1, minHeight: scale(24), marginTop: scale(6) },
  stepBody: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: scale(16),
    backgroundColor: C.white, borderRadius: scale(16), padding: scale(18), marginLeft: scale(14),
    marginBottom: scale(4),
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  stepIconWrap: { width: scale(48), height: scale(48), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText: { flex: 1 },
  stepTitle: { fontSize: scale(15), fontWeight: '800', color: C.navy, marginBottom: scale(4) },
  stepDesc: { fontSize: scale(13), color: C.gray, lineHeight: scale(20) },

  // ── Pricing ──
  pricingSection: { backgroundColor: '#E4F0F8', paddingVertical: scale(72) },
  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(16), marginTop: scale(16) },
  priceCard: {
    backgroundColor: C.white, borderRadius: scale(22), padding: scale(28),
    borderWidth: 2, position: 'relative',
    flex: COL3 ? 1 : undefined,
    minWidth: COL3 ? 260 : undefined, width: COL3 ? undefined : '100%',
    marginBottom: COL3 ? 0 : scale(14),
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 4,
  },
  priceBadge: {
    position: 'absolute', top: -14, alignSelf: 'center', left: '50%',
    backgroundColor: C.tealDk, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 100,
  },
  priceBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  priceIconWrap: { width: scale(60), height: scale(60), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center', marginBottom: scale(14) },
  priceTitle: { fontSize: scale(16), fontWeight: '800', color: C.navy, marginBottom: scale(6) },
  priceAmount: { fontSize: scale(18), fontWeight: '700', marginBottom: scale(10) },
  priceBig: { fontSize: IS_WEB ? 52 : scale(38), fontWeight: '900', lineHeight: IS_WEB ? 56 : scale(42) },
  priceDesc: { fontSize: scale(13), color: C.gray, lineHeight: scale(20), marginBottom: scale(16) },
  priceFeature: { fontSize: scale(13), color: C.text, fontWeight: '500', marginBottom: scale(7) },

  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: scale(20), paddingBottom: scale(14), borderBottomWidth: 1, borderBottomColor: C.border },
  exHeaderText: { fontSize: scale(11), fontWeight: '800', color: C.tealDk, textTransform: 'uppercase', letterSpacing: 0.8 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(12) },
  exLabel: { fontSize: scale(14), color: C.text, fontWeight: '600' },
  exVal: { fontSize: scale(14), color: C.text, fontWeight: '700' },
  exDivider: { height: 1, backgroundColor: C.border, marginVertical: scale(14) },
  exTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exTotalLabel: { fontSize: scale(15), fontWeight: '800', color: C.navy },
  exTotalVal: { fontSize: IS_WEB ? 26 : scale(22), fontWeight: '900', color: C.tealDk },
  exNote: { fontSize: scale(11), color: C.gray, marginTop: scale(12), fontStyle: 'italic' },

  // ── Contact ──
  contactSection: { backgroundColor: C.bg, paddingVertical: scale(72) },
  contactGrid: { flexDirection: IS_WEB && W > 768 ? 'row' : 'column', gap: scale(48) },
  contactInfo: { flex: 1 },
  contactTitle: {
    fontSize: IS_WEB ? 32 : scale(22), fontWeight: '800', color: C.navy, marginBottom: scale(10),
    fontFamily: Platform.select({ web: 'Georgia, serif', default: undefined }),
  },
  contactItem: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(14), marginBottom: scale(22) },
  contactIconWrap: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: 'rgba(46,196,182,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactItemLabel: { fontSize: scale(12), fontWeight: '800', color: C.navy, marginBottom: 2 },
  contactItemVal: { fontSize: scale(13), color: C.gray, fontWeight: '500' },
  contactCta: {
    flex: 1, backgroundColor: C.white, borderRadius: scale(22), padding: scale(28),
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  contactCtaDesc: { fontSize: scale(14), color: C.gray, lineHeight: scale(22), marginBottom: scale(24), marginTop: scale(10) },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(10),
    backgroundColor: C.white, paddingVertical: scale(14), borderRadius: scale(12),
    borderWidth: 2, borderColor: C.teal, marginBottom: scale(20),
  },
  contactBtnText: { fontSize: scale(14), fontWeight: '900', color: C.tealDk },
  contactChips: { flexDirection: 'row', gap: scale(8), flexWrap: 'wrap' },
  contactChip: { backgroundColor: '#E8FFF9', paddingHorizontal: scale(12), paddingVertical: scale(5), borderRadius: 100 },
  contactChipText: { fontSize: scale(11), fontWeight: '700', color: C.tealDk },

  // ── Footer ──
  footer: {
    backgroundColor: '#0D1F1F', paddingVertical: scale(20), paddingHorizontal: scale(24),
    flexDirection: IS_WEB ? 'row' : 'column',
    alignItems: 'center', justifyContent: 'space-between', gap: scale(10),
  },
  footerText: { fontSize: scale(12), color: 'rgba(255,255,255,0.45)', textAlign: IS_WEB ? 'left' : 'center' },
  footerLinks: { flexDirection: 'row', gap: scale(18) },
  footerLink: { fontSize: scale(12), fontWeight: '600', color: C.orange },
});
