# -*- coding: utf-8 -*-
"""
Copy for Claude's Weekly — week of 17 August 2026.

Voice matches the 29-June edition: long justified paragraphs, semicolons doing
the work, compound adjectives left unhyphenated ("risk off", "higher for
longer", "sell off", "year on year"), figures hedged with "about"/"roughly"
where they are a level rather than a print.

Every number here is either (a) a close from the Yahoo Finance daily series
pulled 17-Aug-2026 — the same feed fetch_chart_series.py uses — or (b) a
release/consensus figure verified against at least two outlets. See
verified_tape.md for the price table and the source list.
"""

WEEK_OF = "17 August 2026"
FILE_DATE = "2026-08-17"

WRAP = [
    "Three inflation and activity prints landed last week and, taken together, they said the same thing: the economy is cooling faster than prices are. July CPI on 12 August rose 0.1% on the month and 3.4% on the year, with core up 0.2% and 2.5%, every line in line with consensus and each a tenth below June. July PPI the next day was unchanged on the month against expectations of a rise, though the measure stripping out food, energy and trade services rose 0.4% after 0.1% in June, and the headline still stands 4.7% higher than a year ago. Then Friday's retail sales fell 0.6% against an expected 0.1% gain, the sharpest monthly drop since May 2025, with motor vehicles off 1.8% and non store retailers off 2.2% — and that came a week after July payrolls contracted by 23,000 against forecasts near 83,000 to 95,000, with May and June revised down a combined 103,000. September hike odds duly fell to roughly 38% from better than 48% before the CPI, leaving the Fed's 3.50% to 3.75% range about 62% likely to hold.",

    "The curve's response was the week's most interesting fact, because the front end had none. The two year and the five year finished the week exactly where they began, at about 4.17% and 4.36%, while the thirty year rose five basis points to 5.26% and the ten year four to 4.70% — a bear steepener on soft data, which is what a market does when it stops arguing about the next meeting and starts worrying about term premium, supply and the 4.7% wholesale print instead. Equities took the benign inflation and left the weak consumer: the S&P 500 gained 0.36% to 7,785.76 after setting a record close of 7,798.99 on Thursday, and the Russell 2000 rose 1.12% to 3,068.42, a record of its own. But the leadership was not where the year's story has been. The Nasdaq added just 0.14% and still sits roughly 1.3% below its early June peak, the semiconductor index rose 0.49% and remains about 15% below its record, and the Dow actually fell 0.56%. Small caps leading while big tech lags is a rotation, not a melt up, and the VIX at 14.25 says nobody is paying much for the risk either way.",

    "The earnings tape, meanwhile, is grading on perfection. Cisco beat on 12 August with adjusted earnings of $1.22 against $1.17 expected and revenue of $17.25bn against $16.82bn, up 18% year on year, and guided the current quarter to $18.0bn to $18.2bn against a $16.8bn consensus with earnings of $1.32 to $1.34 against $1.16 — a beat and a raise of a size that ordinarily settles an argument — and the shares fell about 8% on the week from a stock already up more than half on the year. Applied Materials did much the same the following night, posting record revenue of $9.12bn, up 25% year on year on its best ever sequential growth, and guiding October to $10.25bn, up 51%; it fell about 6% as China shrank to 28% of sales from roughly 35% a year earlier. Elsewhere Brent rose 5.95% to $88.52, almost all of it in Monday's $4.17 settle at $87.72, as Iran and the United States traded conditions — Tehran wanting sanctions lifted and frozen funds released, Washington demanding compensation — and hopes of a deal to reopen the Strait of Hormuz faded again. Gold firmed 0.91% to about $4,380 and is near $4,450 as this goes out, a two month high but still well below January's peak; the Korean and Japanese memory complex snapped back hard, the KOSPI up 11.49% and the Nikkei 4.74% with Micron up 10.72%, though that is a bounce off a drawdown of some 23% from June's record rather than a new advance, and it plainly did not generalise to the wider chip tape.",
]

POINTS = [
    ("Rates / Fed: Wednesday's minutes are the transcript of a three dissent fight.",
     "The July meeting held rates at 3.50% to 3.75% but three regional presidents — Beth Hammack, Neel Kashkari and Lorie Logan — dissented in favour of a 25 basis point hike, the first time since September 2016 that three officials have broken the same way, and Chair Warsh told reporters afterwards that he had asked for a good family fight and got one. The minutes of that meeting arrive at 2pm on Wednesday, and with September hike odds already down to about 38% they matter less for the next decision than for how live the hawkish camp remains into the 15 and 16 September meeting, which carries a fresh dot plot. Watch the thirty year at 5.26%, a whisker under the 5.28% it reached on 31 July, for where any hawkish surprise gets expressed."),

    ("Equities / earnings: the consumer gets tested four ways in three days.",
     "Retail sales have just contracted 0.6%, so this week's retailers are the cleanest read on whether that was a blip or a turn. Home Depot reports before Tuesday's open against consensus of $4.71 of earnings on about $47.5bn of revenue, roughly 4.9% higher year on year, and it comes in soft — the shares fell 4.7% last week, and first quarter comparable sales grew just 0.6% while earnings actually fell, as households keep deferring kitchens and bathrooms. Target, Lowe's and TJX follow on Wednesday, then Walmart at 7am on Thursday against about $0.74 of earnings on $186.73bn, where the street is looking for a return to the beat and raise pattern on digital strength. Walmart is the macro print of the four; Home Depot is the rate sensitive one."),

    ("Commodities / geopolitics: Hormuz, still with no deal and no ceasefire.",
     "Brent sits near $88.5 after a 6% week, and the binary that drove it has not moved: Iran's conditions for reopening the strait — sanctions relief and the release of frozen funds — against Washington's demand for compensation, with traffic through the chokepoint running at a fraction of its normal rate and the diplomacy wobbling with each headline. Wednesday's crude inventories are the only scheduled input; everything else is a wire story. A push through $90 revives exactly the passthrough question that last week's 0.4% rise in core wholesale prices has just reopened, while a signed navigation agreement is the other tail, and gold near $4,450 remains the cleanest hedge against the escalation side of it."),

    ("FX: the yen has handed back half the intervention, into a central bank that is now the hawk.",
     "USD/JPY is back near 159 and EUR/JPY has pushed through 184, which means the market has retraced much of the joint intervention that dragged the yen to nearly ¥155 in late July and early August. The Bank of Japan held at 1% on 31 July while warning that core inflation is running above its target, and its 17 and 18 September meeting — two days after the Fed's — is majority priced for a hike. Note that the dollar itself did nothing last week, the index going from 99.60 to 99.67, so this is a yen story rather than a dollar one: 160 in USD/JPY is the level officials have already defended once, and 186 in EUR/JPY is where the carry grind would reclaim the range."),

    ("The week's shape: a record index, a lagging leadership, and two events at the end of the month.",
     "The S&P and the Russell closed at records while the Nasdaq and the semiconductors did not, the VIX sits at 14.25, and a tape that just marked down two comprehensive beats is not one that is short of optimism. The data thins after Wednesday — Philadelphia Fed and jobless claims on Thursday, the flash August purchasing managers indices on Friday — which leaves the retailers to carry the week. Beyond it sit the two events that will set the tone into September: Nvidia's results on 26 August, guided to about $91bn of revenue, and Warsh's first Jackson Hole keynote as chair on 28 August. The question this week is whether the broadening is real, confirmed by the retailers and by small cap leadership, or whether it narrows back to the same handful of names."),
]

SCENARIOS = [
    ("Bull (~25%).",
     "The retailers confirm that July's 0.6% drop in retail sales was a soft patch rather than a turn, Wednesday's minutes read as a committee that argued and then settled, and the Hormuz headlines quieten enough for Brent to slip back under $85. September hike odds erode from 38%, the thirty year backs away from 5.26%, and the rotation broadens further with the Russell confirming its record. The most constructive of the three, and the one that asks the least of the consumer, but it needs the retailers and the minutes to break the same way."),

    ("Base (~50%).",
     "The minutes show a genuinely split committee without changing the September arithmetic, the retailers come in mixed — a soft Home Depot against a solid Walmart is the likeliest combination given the setup — and Brent holds a $85 to $92 range as the diplomacy goes nowhere in particular. The front end stays anchored where it has been all month, the curve stays steep with the thirty year in the mid 5.20s, and equities grind sideways near records while the rotation into small caps quietly continues. A grind, and the path of least resistance from a 14 handle VIX."),

    ("Bear (~25%).",
     "The retailers confirm the contraction rather than contradicting it, or the minutes read hawkish enough to put the three dissenters back at the centre of the September debate, or Brent takes out $90 and drags the wholesale inflation question with it. The thirty year clears its 5.28% July high, the record closes in the S&P and the Russell look like the top of the rotation rather than the start of it, and a market paying 14 for protection has to pay more. The tell that this is happening is the same one that has worked all month: a beat that gets sold, as Cisco and Applied Materials both were."),
]

FOCUS_TITLE = "the dollar neutral yen short"

FOCUS = [
    "The cleanest expression of the yen policy view this week is not in the dollar at all. EUR/JPY made its record near 187.95 in April on the widest carry gap in decades; the joint intervention at the end of July knocked it roughly 4% to a low of 179.37 on 3 August; and it has now retraced most of that break to about 184.3, back inside the zone where both Japanese and American officials said publicly that they remained concerned about the level and path of the yen. The trade is to sell that retracement with defined risk: a six to eight week 183/177 put spread for roughly 1% to 1.2% of notional, scaled into strength in the 184 to 185 area rather than chased, targeting the 178 to 179 intervention low zone and taking at least half off at 180. The reason to prefer the cross to a straight USD/JPY position is that it is dollar neutral by construction, which isolates the September Bank of Japan meeting — majority priced for a hike, against a European Central Bank for which further action is merely optional — from the Fed risk that Wednesday's minutes and the 15 and 16 September meeting represent.",

    "Two risks deserve naming rather than burying. The first is carry: the roughly 125 basis point gap between European and Japanese policy rates is what has ground this cross higher all year, and it does not stop paying just because the level is uncomfortable for officials — which is precisely why the position is a premium capped put spread sold into strength rather than a short in the spot market, and why two daily closes above 186 should be treated as the thesis being wrong rather than early. The second is the catalyst itself: if the Bank of Japan holds on 18 September, the hawkish leg of the argument is gone while the carry is still against the position, and the spread will expire for whatever it is worth rather than for what it was bought for. Capital at risk is the premium and nothing more, which is the point of expressing it this way.",
]

FOOT_ASOF = (
    "As of 17 August 2026 (week ending 14 August 2026). Index, yield, currency and commodity "
    "levels are closes from the Yahoo Finance daily series, pulled 17 August 2026. Releases and "
    "consensus figures verified against at least two independent sources: Bureau of Labor "
    "Statistics, Census Bureau, Federal Reserve, Federal Reserve Bank of Kansas City, CME "
    "FedWatch, company releases (Cisco, Applied Materials, Nvidia), Reuters, CNBC, Bloomberg, "
    "Al Jazeera, Quartz, Kiplinger, Barchart."
)

FOOT_PENDING = (
    "Flagged as pending or developing: the FOMC minutes, Home Depot, Target, Lowe's, TJX and "
    "Walmart are all upcoming this week, as are the Philadelphia Fed survey, jobless claims and "
    "the flash purchasing managers indices; Nvidia on 26 August and the Jackson Hole keynote on "
    "28 August fall outside it. The Strait of Hormuz position is unresolved and moves on the wire. "
    "The September Bank of Japan hike is described as majority priced because implied probabilities "
    "differ materially across venues — prediction markets have run near 80% while swap implied "
    "readings have been closer to half — so no single figure is quoted. The focus idea's premium of "
    "roughly 1% to 1.2% is a desk estimate, not a dealer quote. For discussion only — not an offer, "
    "a recommendation, investment research, or personalised investment advice."
)
