window.CONSTITUTIONAL_WATCH_DATA = {
  meta: {
    title: "이재명 정부 국제표준 모니터",
    updatedAt: "2026-03-21 16:18 KST",
    status: "감시 구간: 2025-06-04 이후 / 국내 기관 제로트러스트",
    monitoringWindow: "이재명 정부 출범 이후"
  },
  verdict: {
    triggerScore: 57,
    level: "현 정부 외부기준 우선판정",
    short: "이재명 정부를 국제표준 + 외신 + 국민 원자료로 감시",
    summary:
      "이 버전은 2025년 6월 4일 이후의 이재명 정부를 감시 구간으로 삼습니다. 국내 언론, 사법부, 입법부, 행정부, 정치권 발표를 상태판단 근거에서 제외하고, 자유민주주의 헌정질서를 구성하는 보편 자유권 기준, 국제 연구지표, 자유민주권 외신의 다중 교차검증, 검증 가능한 국민 원자료만으로 산정합니다.",
    points: [
      "감시 구간 이전의 사건은 현재판 점수 엔진에서 제외했습니다.",
      "이재명 정부 출범 이후의 권력 집중, 언론 자유, 사법기관 포획 징후, 선거 경쟁 공정성만 추적합니다.",
      "단일 기사, 단일 판결, 단일 정치인 발언으로는 점수를 바꾸지 않습니다."
    ]
  },
  participation: {
    rules: [
      "실명, 주민번호, 연락처, 얼굴 식별 정보는 올리지 않거나 비공개 처리합니다.",
      "캡처본보다 원본 링크, 원본 파일, 촬영 시각과 위치 정보가 우선입니다.",
      "제보는 주장보다 관찰 사실 중심으로 적고, 추정은 분리합니다.",
      "폭력 조장, 보복, 낙인, 사적 제재를 유도하는 내용은 받지 않습니다.",
      "최소 한 개의 검증 단서와 한 개의 원자료 보존 단서를 남기는 것을 권장합니다."
    ],
    steps: [
      "원자료 보존: 원본 파일, 링크, 해시, 시각, 위치를 먼저 확보합니다.",
      "표준화: 어떤 권리와 기준이 침해됐는지 국제 기준 축에 맞춰 분류합니다.",
      "로컬 큐 저장: 제보를 브라우저 로컬 큐에 넣고 검증 체크를 기록합니다.",
      "익명 공개: 제보자가 허용한 건만 공개 피드로 올립니다.",
      "공개 신호와 검토자 표결 분리: 공개 의견은 열어두되, 최종 검증 상태는 로그인된 검토자 표결과 감사 로그로만 변경합니다."
    ],
    accessControl: {
      rules: [
        "익명 제보는 열어두되, 최종 검증 표는 로그인된 검토자와 운영자만 행사합니다.",
        "공개 댓글과 공개 신호는 참고자료이며, 단독으로 사건 상태를 바꾸지 못합니다.",
        "운영자 권한은 공개/비공개 전환, 검토 완료 토글, 삭제와 감사 로그 확인에 사용합니다.",
        "현재 키는 로컬 테스트용이며, 실배포 시에는 서버 발급 초대키와 피싱 저항형 로그인으로 교체해야 합니다."
      ],
      roles: [
        {
          key: "reviewer",
          label: "검토자",
          weight: 1,
          summary: "검토자 표는 최종 검증 합의 계산에 반영됩니다."
        },
        {
          key: "operator",
          label: "운영자",
          weight: 1,
          summary: "운영자는 검토자 기능에 더해 공개 관리와 운영 큐 제어가 가능합니다."
        }
      ],
      demoKeys: [
        {
          role: "reviewer",
          label: "검토자 테스트 키",
          value: "review-2026-local"
        },
        {
          role: "operator",
          label: "운영자 테스트 키",
          value: "ops-2026-local"
        }
      ]
    },
    categories: [
      "언론 자유",
      "집회·결사 자유",
      "표현의 자유",
      "사법기관 포획 징후",
      "선거 경쟁 공정성",
      "행정권 남용",
      "디지털 검열",
      "기본권 직접 침해",
      "기타"
    ],
    exposureLevels: [
      "운영자만 검토",
      "익명 공개 가능",
      "요약만 공개 가능"
    ],
    publicRules: [
      "공개 피드에서는 제보자 별칭, 연락처, 민감한 개인식별 정보가 숨겨집니다.",
      "한 브라우저는 사건별로 한 번만 공개 신호를 남길 수 있고, 나중에 수정은 가능합니다.",
      "최종 검증 상태를 바꾸는 표결은 로그인된 검토자와 운영자만 행사합니다.",
      "원본을 직접 보지 못했거나 맥락을 모르면 공개 신호는 보류 또는 추가 자료 필요 쪽으로 남깁니다.",
      "조작 의심이나 맥락 누락 판단을 할 때는 짧은 사유 메모를 남기는 것을 권장합니다.",
      "현재 버전은 로컬 프로토타입이므로 실제 다수 참여를 위해서는 공용 저장소와 운영 검토 레이어가 추가로 필요합니다."
    ],
    anonymousBoard: {
      rules: [
        "실명, 연락처, 소속, 상세 주소 같은 신원정보는 쓰지 않습니다.",
        "단정적 사실 주장보다 질문, 문제제기, 자료요청, 관찰 메모 중심으로 씁니다.",
        "폭력 선동, 보복 제안, 신상 공개, 허위사실 유포는 금지합니다.",
        "근거가 있는 경우 원본 링크나 제보 카드 제목을 함께 적어 맥락을 연결합니다."
      ],
      categories: [
        "자유 토론",
        "자료 요청",
        "현장 상황 공유",
        "운영 제안",
        "패턴 정리"
      ],
      reactions: [
        {
          key: "agree",
          label: "공감",
          description: "문제의식에 동의하거나 계속 추적할 가치가 있다고 봄"
        },
        {
          key: "needs_evidence",
          label: "근거 보완",
          description: "주장은 이해되지만 링크나 원자료가 더 필요함"
        },
        {
          key: "track",
          label: "추적 필요",
          description: "지금은 결론보다 후속 관찰과 정리가 더 중요함"
        }
      ]
    },
    verdictOptions: [
      {
        key: "support",
        label: "검증에 힘 실림",
        description: "원자료와 맥락이 대체로 맞고 공개 유지가 가능하다고 봄"
      },
      {
        key: "needs_more",
        label: "추가 자료 필요",
        description: "지금 정보만으로는 판단 보류, 추가 링크나 원본이 더 필요함"
      },
      {
        key: "doubt",
        label: "신뢰 곤란",
        description: "조작, 맥락 누락, 위치·시각 불일치가 의심됨"
      }
    ]
  },
  metrics: [
    {
      tone: "risk",
      label: "현 정부 국제표준 위반 징후",
      value: 62,
      scale: "경계",
      note:
        "표현의 자유, 집회·결사, 선거 경쟁, 권력분립, 자의적 권한 행사 금지 기준에서 현 정부가 얼마나 멀어지는지를 봅니다."
    },
    {
      tone: "stability",
      label: "외부 독립검증 밀도",
      value: 59,
      scale: "보통",
      note:
        "동맹국·자유민주권 외신, 국제 연구기관, 자유민주주의 헌정질서 기준문서가 서로 일치하는지로 점검합니다."
    },
    {
      tone: "evidence",
      label: "국민 원자료 검증률",
      value: 54,
      scale: "보완필요",
      note:
        "영상 원본, 게시 시각, 위치, 메타데이터, 다각도 확인이 갖춰진 시민자료만 반영합니다."
    },
    {
      tone: "readiness",
      label: "비폭력 기록대응 준비도",
      value: 69,
      scale: "보통",
      note:
        "원자료 보존, 외부 미러링, 국제 기준 매핑, 평화적 시민행동 기록 프로토콜이 어느 정도 갖춰졌는지를 봅니다."
    }
  ],
  trustWeights: [
    {
      title: "국내 기관 자료",
      status: "watch",
      badge: "0점처리",
      summary:
        "국내 언론, 사법부, 입법부, 행정부, 정치권 발표는 이재명 정부 상태판단 점수에 넣지 않습니다.",
      checks: [
        "기관 발표를 평가근거 목록에서 제외했는가",
        "국내 기사와 정치인 발언을 점수 엔진에서 제거했는가",
        "국내 판결과 수사발표가 상태 변화에 직접 연결되지 않는가"
      ],
      current:
        "현 정부 평가는 국제 기준 위반 여부와 국민 원자료가 우선입니다.",
      basis: ["운영규칙", "소스 화이트리스트", "점수 엔진 규칙"]
    },
    {
      title: "국제표준",
      status: "clear",
      badge: "최우선",
      summary:
        "상태판단의 1차 기준은 자유민주주의 헌정질서를 구성하는 보편 자유권 기준 문서입니다. 규범 위반이 먼저이고, 그 다음이 사실관계 검증입니다.",
      checks: [
        "UDHR/ICCPR 등 기본권 기준과 충돌하는가",
        "법치·권력분립·선거 경쟁 기준을 벗어나는가",
        "일시적 사건이 아니라 구조적 패턴이 관측되는가"
      ],
      current:
        "기준문서 매핑 없이는 어떤 외신 기사도 결론 근거가 될 수 없습니다.",
      basis: ["UDHR", "ICCPR", "Venice Rule of Law Checklist"]
    },
    {
      title: "자유민주권 외신과 국민 원자료",
      status: "watch",
      badge: "교차필수",
      summary:
        "외신은 단독 근거가 아니라 교차검증 도구입니다. 최종 사실판단은 외신 다중 일치와 국민 원자료 원본 확인이 함께 있어야 합니다.",
      checks: [
        "외신 소유구조와 편집 독립성이 확인되는가",
        "서로 독립된 복수 외신이 같은 핵심 사실을 지지하는가",
        "국민 원자료 원본이 시간·장소·맥락을 뒷받침하는가"
      ],
      current:
        "기사 한 건이 아니라 외신 다중 일치와 시민 원자료가 동시에 있을 때만 상태 변화로 반영합니다.",
      basis: ["Reuters Trust Principles", "AP Principles", "BBC Editorial Guidelines"]
    }
  ],
  criteria: [
    {
      title: "이재명 정부 하에서 자유민주주의 헌정질서 핵심 축이 구조적으로 훼손되는가",
      status: "watch",
      badge: "핵심",
      summary:
        "정책 실패나 정파 갈등이 아니라, 표현의 자유, 집회·결사, 선거 경쟁, 권력분립, 자의적 권한 행사 금지 축이 현 정부 하에서 지속적으로 훼손되는지를 봅니다.",
      checks: [
        "행정권 집중 또는 당·정 일체화가 심화되는가",
        "언론·표현·집회 자유가 구조적으로 위축되는가",
        "선거 경쟁과 대표성의 실질이 훼손되는가"
      ],
      current:
        "국제 규범과 외부 지표를 기준으로 현 정부의 권력 집중, 자유 위축, 경쟁 훼손 패턴을 추적하도록 설계했습니다.",
      basis: ["UDHR", "ICCPR", "Freedom House 2025"]
    },
    {
      title: "외부 독립검증이 현 정부에 대해 반복·일관되게 같은 결론을 가리키는가",
      status: "watch",
      badge: "교차검증",
      summary:
        "단일 외신 기사나 단일 보고서는 결론 근거가 아닙니다. 서로 독립된 국제 소스가 이재명 정부 시기의 같은 문제를 장기간 지적하는지를 봅니다.",
      checks: [
        "국제지표와 외신이 같은 축의 문제를 반복적으로 지적하는가",
        "소유구조가 독립된 외신들이 핵심 사실에 합치하는가",
        "국민 원자료가 외부 소스를 뒷받침하는가"
      ],
      current:
        "점수는 최소 2개 이상의 독립 외부 소스와 원자료 확인 없이는 오르지 않게 구성했습니다.",
      basis: ["RSF 2025", "Freedom on the Net 2025", "V-Dem"]
    },
    {
      title: "목적은 자유 보전과 질서 회복에 한정되는가",
      status: "watch",
      badge: "엄격",
      summary:
        "정파 승리, 보복, 숙청, 지도자 구출이 목적이 되면 자유민주헌정질서 논의가 아니라 권력투쟁이 됩니다.",
      checks: [
        "요구가 자유 보전과 자유민주주의 헌정질서 회복에 한정되는가",
        "특정 진영 승패와 분리된 규범 언어를 유지하는가",
        "폭력·무장·보복을 수단으로 삼지 않는가"
      ],
      current:
        "사이트의 메시지는 정파적 승부가 아니라 자유, 절차, 권리, 비폭력 기록에 고정돼야 합니다.",
      basis: ["UDHR", "ICCPR", "V-Dem"]
    }
  ],
  responses: [
    {
      step: "1단계",
      title: "현 정부 관련 국민 원자료 원본 보존",
      summary:
        "영상 원본, 원문 URL, 게시 시각, 촬영 위치, 작성 주체, 파일 해시를 먼저 고정합니다. 캡처 이미지는 보조자료일 뿐입니다.",
      links: [
        { label: "UDHR", url: "https://www.un.org/en/about-us/universal-declaration-of-human-rights" },
        { label: "ICCPR", url: "https://2covenants.ohchr.org/" }
      ]
    },
    {
      step: "2단계",
      title: "이재명 정부 관련 국제 기준 위반 맵 작성",
      summary:
        "각 사건을 표현의 자유, 집회·결사, 자의적 구금 금지, 선거 경쟁, 권력분립 기준에 맞춰 표준화합니다.",
      links: [
        { label: "Venice Rule of Law Checklist", url: "https://www.coe.int/en/web/venice-commission/-/CDL-ad%282016%29007-e" },
        { label: "OSCE ODIHR", url: "https://www.osce.org/odihr/elections" }
      ]
    },
    {
      step: "3단계",
      title: "외신 독립성 필터 적용",
      summary:
        "소유구조가 불투명하거나 국가·정당 영향권이 의심되는 외신은 제외하거나 낮은 가중치를 부여합니다.",
      links: [
        { label: "Reuters Trust Principles", url: "https://www.thomsonreuters.com/en/about-us/trust-principles.html" },
        { label: "AP News Values", url: "https://www.ap.org/about/news-values-and-principles/" },
        { label: "BBC Editorial Guidelines", url: "https://downloads.bbc.co.uk/guidelines/editorialguidelines/pdfs/Editorial_Guidelines_in_full.pdf" }
      ]
    },
    {
      step: "4단계",
      title: "외부 미러링과 공개 검증",
      summary:
        "원자료와 사건 타임라인을 외부 저장소와 해외 네트워크에 미러링하고, 독립 외신과 국제 워치독이 검증 가능한 형태로 공개합니다.",
      links: [
        { label: "RSF South Korea", url: "https://rsf.org/en/south-korea" },
        { label: "Freedom House 2025", url: "https://freedomhouse.org/country/south-korea/freedom-world/2025" }
      ]
    },
    {
      step: "5단계",
      title: "비폭력 시민행동과 기록 유지",
      summary:
        "평화적 집회, 공개질의, 사실검증 보고서, 국제 전달문서 작성처럼 비폭력적이고 기록 중심인 대응만 유지합니다.",
      links: [
        { label: "Freedom on the Net 2025", url: "https://freedomhouse.org/country/south-korea/freedom-net/2025" },
        { label: "V-Dem", url: "https://v-dem.net/" }
      ]
    }
  ],
  prohibited: [
    "폭력, 방화, 무기 소지, 시설 파괴",
    "개인정보 공개, 신상털기, 협박, 보복",
    "허위정보, 합성물, 맥락 삭제 편집물 유포",
    "사적 체포, 자경단 조직, 임의 검문",
    "단일 기사나 단일 주장만으로 낙인·선동"
  ],
  indicators: [
    {
      tone: "alert",
      name: "행정권 집중·자의권한",
      score: 64,
      trend: "상승 경계",
      description:
        "현 정부가 국제 기준상 권력 집중과 자의적 권한 행사 방향으로 움직이는지를 감시합니다.",
      proof: ["국제 기준 위반 맵", "외신 교차일치", "국민 원자료"]
    },
    {
      tone: "watch",
      name: "언론 자유 위축",
      score: 67,
      trend: "외부기준 비교",
      description:
        "언론 환경 악화 여부를 국내 기사 수가 아니라 외부 언론자유 지표와 편집 독립성 기준으로 봅니다.",
      proof: ["RSF", "Freedom House", "외신 일치"]
    },
    {
      tone: "alert",
      name: "사법기관 포획 징후",
      score: 72,
      trend: "결과배제 감시",
      description:
        "재판 결과가 아니라 인사 개입, 구조적 편향 논란, 독립 법조 경고만 추적합니다.",
      proof: ["국제 사법독립 평가", "법조계 경고", "외신 일치"]
    },
    {
      tone: "alert",
      name: "기본권 직접 침해",
      score: 56,
      trend: "원자료 대기",
      description:
        "집회 제한, 과잉진압, 표현 제재, 디지털 검열 같은 직접 침해를 국민 원자료와 외부 기준으로 확인합니다.",
      proof: ["영상 원본", "메타데이터", "국제 기준 매핑"]
    },
    {
      tone: "stability",
      name: "선거 경쟁 공정성",
      score: 58,
      trend: "조건부",
      description:
        "선거의 존재보다 경쟁 공정성, 감시 가능성, 제도 독립성을 국제 선거 기준으로 평가합니다.",
      proof: ["ODIHR 기준", "외신 교차일치", "감시 보고"]
    },
    {
      tone: "stability",
      name: "외부 검증 수렴도",
      score: 61,
      trend: "추가 수집",
      description:
        "국제 기준, 외신, 국제지표, 시민 원자료가 같은 방향으로 수렴하는지를 봅니다.",
      proof: ["기준문서", "국제지표", "원자료"]
    }
  ],
  filters: [
    { key: "all", label: "전체" },
    { key: "standard", label: "국제표준" },
    { key: "index", label: "국제지표" },
    { key: "foreign", label: "외신기준" },
    { key: "method", label: "검증규칙" }
  ],
  feed: [
    {
      type: "method",
      tone: "guide",
      date: "2025-06-04",
      title: "감시 구간 시작: 이재명 정부 출범",
      summary:
        "현재판 대시보드는 이재명 정부 출범 이후를 감시 구간으로 잡습니다. 이전 정권 사건은 현재 점수 엔진에서 제외합니다.",
      impact: "과거 정권 이슈와 현재 정부 감시를 분리",
      effect: "positive",
      url: "https://www.youtube.com/watch?v=e-HyEjPLtso"
    },
    {
      type: "standard",
      tone: "guide",
      date: "1948",
      title: "UDHR: 보편적 자유와 권리 기준",
      summary:
        "자유민주주의 헌정질서 판단의 첫 기준은 자유와 권리의 보편 기준입니다. 사건은 항상 이 기준에 대조해 분류합니다.",
      impact: "기사보다 규범이 먼저",
      effect: "positive",
      url: "https://www.un.org/en/about-us/universal-declaration-of-human-rights"
    },
    {
      type: "standard",
      tone: "guide",
      date: "1966",
      title: "ICCPR: 시민적·정치적 권리 기준",
      summary:
        "표현의 자유, 집회·결사, 자의적 구금 금지, 공적 참여 기준을 사건별로 매핑하는 핵심 문서입니다.",
      impact: "국제 인권기준으로 사건을 표준화",
      effect: "positive",
      url: "https://2covenants.ohchr.org/"
    },
    {
      type: "standard",
      tone: "guide",
      date: "2016",
      title: "Venice Rule of Law Checklist",
      summary:
        "법치, 권력 제한, 예측가능성, 자의금지 원칙을 체크리스트 형태로 제공하는 기준 문서입니다.",
      impact: "권력분립과 자의금지 점검 축",
      effect: "positive",
      url: "https://www.coe.int/en/web/venice-commission/-/CDL-ad%282016%29007-e"
    },
    {
      type: "standard",
      tone: "guide",
      date: "상시",
      title: "OSCE ODIHR 선거 기준",
      summary:
        "선거의 존재 여부가 아니라 경쟁 공정성, 관찰 가능성, 참여권을 국제 기준으로 평가할 때 참고하는 프레임입니다.",
      impact: "선거 정상성 판단을 형식에서 실질로 이동",
      effect: "positive",
      url: "https://www.osce.org/odihr/elections"
    },
    {
      type: "index",
      tone: "watch",
      date: "2025",
      title: "RSF 2025: 언론자유 외부 점검",
      summary:
        "국내 언론 보도량이 아니라 외부 언론자유 지표를 기준으로 한국의 언론 환경을 비교합니다.",
      impact: "언론 자유 축의 외부 기준점",
      effect: "mixed",
      url: "https://rsf.org/en/south-korea"
    },
    {
      type: "index",
      tone: "watch",
      date: "2025",
      title: "Freedom House 2025: 자유 상태와 후퇴 징후 비교",
      summary:
        "정치적 자유와 시민적 자유를 국제 비교 지표로 보고, 구조적 후퇴가 있는지를 장기 추세로 추적합니다.",
      impact: "단발 사건이 아닌 장기 추세 비교",
      effect: "mixed",
      url: "https://freedomhouse.org/country/south-korea/freedom-world/2025"
    },
    {
      type: "index",
      tone: "watch",
      date: "2025",
      title: "Freedom on the Net 2025: 디지털 자유 축 별도 관리",
      summary:
        "온라인 자유는 오프라인 자유민주주의 헌정질서와 별도로 감시해야 하므로 독립 트랙으로 관리합니다.",
      impact: "온라인 검열과 플랫폼 억압 감시",
      effect: "mixed",
      url: "https://freedomhouse.org/country/south-korea/freedom-net/2025"
    },
    {
      type: "index",
      tone: "watch",
      date: "2025",
      title: "V-Dem: 민주주의 후퇴의 비교 데이터",
      summary:
        "국가별 자유민주주의 후퇴까지 장기 비교할 수 있는 연구 데이터셋으로, 단일 사건이 아니라 구조적 추세를 보는 데 유용합니다.",
      impact: "구조적 후퇴 여부를 장기 비교",
      effect: "mixed",
      url: "https://v-dem.net/"
    },
    {
      type: "foreign",
      tone: "guide",
      date: "상시",
      title: "Reuters Trust Principles",
      summary:
        "외신을 사용할 때는 기사 내용보다 먼저 편집 독립성과 이해상충 방지 원칙을 확인합니다.",
      impact: "외신 화이트리스트 필터 기준",
      effect: "positive",
      url: "https://www.thomsonreuters.com/en/about-us/trust-principles.html"
    },
    {
      type: "foreign",
      tone: "guide",
      date: "상시",
      title: "AP News Values and Principles",
      summary:
        "정확성, 공정성, 독립성 원칙이 명시된 외신만 화이트리스트에 올립니다.",
      impact: "외신 신뢰도 평가의 공통 기준",
      effect: "positive",
      url: "https://www.ap.org/about/news-values-and-principles/"
    },
    {
      type: "foreign",
      tone: "guide",
      date: "상시",
      title: "BBC Editorial Guidelines",
      summary:
        "외신도 편집 가이드라인이 공개되어 있고 독립성 규칙이 명확한 경우에만 보조 근거로 사용합니다.",
      impact: "소유·편집 독립성 공개 여부 확인",
      effect: "positive",
      url: "https://downloads.bbc.co.uk/guidelines/editorialguidelines/pdfs/Editorial_Guidelines_in_full.pdf"
    },
    {
      type: "method",
      tone: "watch",
      date: "운영규칙",
      title: "국내 기사·판결·정치발언은 점수에 0점 처리",
      summary:
        "국내 제도기관 포획 가설을 전제로, 국내 기관 자료는 상태판단 점수에 넣지 않습니다.",
      impact: "자기참조적 판단 구조를 제거",
      effect: "mixed",
      url: "https://v-dem.net/"
    },
    {
      type: "method",
      tone: "watch",
      date: "운영규칙",
      title: "단일 기사 논리는 금지",
      summary:
        "“기사 보니 맞다더라” 식 판단을 막기 위해 단일 기사, 단일 인터뷰, 단일 바이럴 영상으로는 상태를 바꾸지 않습니다.",
      impact: "AI식 단문 추론과 기사 의존을 차단",
      effect: "mixed",
      url: "https://www.un.org/en/about-us/universal-declaration-of-human-rights"
    },
    {
      type: "method",
      tone: "watch",
      date: "운영규칙",
      title: "외신도 소유구조 불투명하면 제외",
      summary:
        "외신이라고 자동 신뢰하지 않습니다. 국가·정당 영향권, 소유구조 불명확, 편집 독립성 불명확 매체는 제외하거나 감점합니다.",
      impact: "외신 오염 리스크를 별도 관리",
      effect: "mixed",
      url: "https://www.thomsonreuters.com/en/about-us/trust-principles.html"
    }
  ],
  sources: [
    {
      type: "감시 구간",
      article: "2025-06-04",
      title: "Reuters: Lee Jae-myung inauguration",
      note: "이재명 정부 감시 구간 시작일 확인용",
      url: "https://www.youtube.com/watch?v=e-HyEjPLtso"
    },
    {
      type: "국제표준",
      article: "1948",
      title: "Universal Declaration of Human Rights",
      note: "자유와 권리의 보편 기준",
      url: "https://www.un.org/en/about-us/universal-declaration-of-human-rights"
    },
    {
      type: "국제표준",
      article: "1966",
      title: "International Covenant on Civil and Political Rights",
      note: "표현, 집회, 결사, 자의적 구금 금지, 정치적 참여 기준",
      url: "https://2covenants.ohchr.org/"
    },
    {
      type: "국제표준",
      article: "2016",
      title: "Venice Commission Rule of Law Checklist",
      note: "법치와 자의금지, 권력 제한 기준",
      url: "https://www.coe.int/en/web/venice-commission/-/CDL-ad%282016%29007-e"
    },
    {
      type: "국제표준",
      article: "상시",
      title: "OSCE ODIHR Elections",
      note: "선거 경쟁 공정성과 관찰 기준",
      url: "https://www.osce.org/odihr/elections"
    },
    {
      type: "국제지표",
      article: "2025",
      title: "RSF South Korea",
      note: "언론자유 지표 및 언론 환경 요약",
      url: "https://rsf.org/en/south-korea"
    },
    {
      type: "국제지표",
      article: "2025",
      title: "Freedom in the World 2025",
      note: "정치적 자유와 시민적 자유 종합 지표",
      url: "https://freedomhouse.org/country/south-korea/freedom-world/2025"
    },
    {
      type: "국제지표",
      article: "2025",
      title: "Freedom on the Net 2025",
      note: "온라인 자유 및 디지털 권리 지표",
      url: "https://freedomhouse.org/country/south-korea/freedom-net/2025"
    },
    {
      type: "국제지표",
      article: "2025",
      title: "V-Dem",
      note: "자유민주주의 후퇴까지 비교하는 데이터셋",
      url: "https://v-dem.net/"
    },
    {
      type: "외신기준",
      article: "상시",
      title: "Reuters Trust Principles",
      note: "편집 독립성과 이해상충 방지 기준",
      url: "https://www.thomsonreuters.com/en/about-us/trust-principles.html"
    },
    {
      type: "외신기준",
      article: "상시",
      title: "AP News Values and Principles",
      note: "정확성, 공정성, 독립성 기준",
      url: "https://www.ap.org/about/news-values-and-principles/"
    },
    {
      type: "외신기준",
      article: "상시",
      title: "BBC Editorial Guidelines",
      note: "편집 독립성과 검증 원칙",
      url: "https://downloads.bbc.co.uk/guidelines/editorialguidelines/pdfs/Editorial_Guidelines_in_full.pdf"
    }
  ]
};
