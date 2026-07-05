const LABEL_OFFSET = 7;
const LABEL_PADDING = 1;
const STORAGE_LABEL_PADDING = 1.5;
const PLACE_MARKER_PADDING = 5;
const STORAGE_MARKER_PADDING = 7;
const STORAGE_PLACE_TYPE = "Speicher";
const VIEWPORT_PADDING = 8;

const createRightCandidate = (placement, yShift, offset, baseScore, leader = "near") => ({
   placement,
   dx: 1,
   dy: Math.sign(yShift),
   baseScore,
   leader,
   anchor: ({ height }) => [-offset, height / 2 - yShift]
});

const createLeftCandidate = (placement, yShift, offset, baseScore, leader = "near") => ({
   placement,
   dx: -1,
   dy: Math.sign(yShift),
   baseScore,
   leader,
   anchor: ({ width, height }) => [width + offset, height / 2 - yShift]
});

const createBottomCandidate = (placement, offset, baseScore, leader = "near") => ({
   placement,
   dx: 0,
   dy: 1,
   baseScore,
   leader,
   anchor: ({ width }) => [width / 2, -offset]
});

const createTopCandidate = (placement, offset, baseScore, leader = "near") => ({
   placement,
   dx: 0,
   dy: -1,
   baseScore,
   leader,
   anchor: ({ width, height }) => [width / 2, height + offset]
});

const LABEL_CANDIDATES = [
   createRightCandidate("right-tight", 0, 5, 0),
   createLeftCandidate("left-tight", 0, 5, 0.08),
   {
      placement: "right",
      dx: 1,
      dy: 0,
      baseScore: 0,
      leader: "near",
      anchor: ({ height }) => [-LABEL_OFFSET, height / 2]
   },
   {
      placement: "left",
      dx: -1,
      dy: 0,
      baseScore: 0.15,
      leader: "near",
      anchor: ({ width, height }) => [width + LABEL_OFFSET, height / 2]
   },
   createRightCandidate("right-up", -7, LABEL_OFFSET, 0.28),
   createRightCandidate("right-down", 7, LABEL_OFFSET, 0.3),
   createLeftCandidate("left-up", -7, LABEL_OFFSET, 0.38),
   createLeftCandidate("left-down", 7, LABEL_OFFSET, 0.4),
   createRightCandidate("right-up-small", -4, 6, 0.42),
   createRightCandidate("right-down-small", 4, 6, 0.44),
   createLeftCandidate("left-up-small", -4, 6, 0.48),
   createLeftCandidate("left-down-small", 4, 6, 0.5),
   createRightCandidate("right-far", 0, 12, 0.58, "far"),
   createLeftCandidate("left-far", 0, 12, 0.68, "far"),
   createRightCandidate("top-right", -12, 6, 0.76),
   createRightCandidate("bottom-right", 12, 6, 0.8),
   createLeftCandidate("top-left", -12, 6, 0.86),
   createLeftCandidate("bottom-left", 12, 6, 0.9),
   createBottomCandidate("bottom-tight", 5, 1.05),
   createTopCandidate("top-tight", 5, 1.12),
   createBottomCandidate("bottom", LABEL_OFFSET, 1.28, "far"),
   createTopCandidate("top", LABEL_OFFSET, 1.38, "far")
];

const toPoint = point => ({ x: Number(point.x), y: Number(point.y) });

const inflateRect = (rect, amount) => ({
   bottom: rect.bottom + amount,
   left: rect.left - amount,
   right: rect.right + amount,
   top: rect.top - amount
});

const createRect = (point, size, anchor) => ({
   bottom: point.y - anchor[1] + size.height,
   left: point.x - anchor[0],
   right: point.x - anchor[0] + size.width,
   top: point.y - anchor[1]
});

const isStoragePlace = place => place.type === STORAGE_PLACE_TYPE;

const getLabelPadding = place => (isStoragePlace(place) ? STORAGE_LABEL_PADDING : LABEL_PADDING);

const getMarkerPadding = place => (isStoragePlace(place) ? STORAGE_MARKER_PADDING : PLACE_MARKER_PADDING);

const createMarkerRect = ({ place, point }) =>
   inflateRect(
      {
         bottom: point.y,
         left: point.x,
         right: point.x,
         top: point.y
      },
      getMarkerPadding(place)
   );

const isInsideViewport = (rect, mapSize) =>
   rect.left >= VIEWPORT_PADDING &&
   rect.top >= VIEWPORT_PADDING &&
   rect.right <= mapSize.width - VIEWPORT_PADDING &&
   rect.bottom <= mapSize.height - VIEWPORT_PADDING;

const rectsOverlap = (left, right) =>
   left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;

const textWidthCache = new Map();
let textMeasureCanvas = null;

// Vor dem Laden des Webfonts misst der Canvas mit der Fallback-Schrift; solche Breiten dürfen
// nicht dauerhaft im Cache bleiben, sonst kollidieren später in Montserrat gerenderte Labels.
if (typeof document !== "undefined" && document.fonts?.addEventListener) {
   document.fonts.addEventListener("loadingdone", () => textWidthCache.clear());
}

const measureTextWidth = (text, fontSize, fontWeight) => {
   const fallbackWidth = [...text].length * fontSize * 0.54;

   if (typeof document === "undefined") return fallbackWidth;

   const cacheKey = `${fontWeight}:${fontSize}:${text}`;
   if (textWidthCache.has(cacheKey)) return textWidthCache.get(cacheKey);

   textMeasureCanvas ??= document.createElement("canvas");
   const context = textMeasureCanvas.getContext("2d");
   if (!context) return fallbackWidth;

   context.font = `${fontWeight} ${fontSize}px Montserrat, Arial, sans-serif`;

   const width = context.measureText(text).width;
   textWidthCache.set(cacheKey, width);

   return width;
};

const measureLabel = (place, zoom) => {
   const baseFontSize = zoom >= 7 ? 10.8 : zoom >= 6 ? 10.25 : 9.6;
   const fontSize = isStoragePlace(place) ? baseFontSize + 0.35 : baseFontSize;
   const fontWeight = isStoragePlace(place) ? 650 : 550;

   return {
      fontSize,
      height: Math.ceil(fontSize * 1.24),
      width: Math.ceil(measureTextWidth(place.name, fontSize, fontWeight) + 3)
   };
};

const getCandidateScore = (candidate, point, mapSize) => {
   let score = candidate.baseScore;

   if (point.x < mapSize.width * 0.34 && candidate.dx < 0) score += 1.5;
   if (point.x > mapSize.width * 0.66 && candidate.dx > 0) score += 1.5;
   if (point.y < mapSize.height * 0.28 && candidate.dy < 0) score += 1.2;
   if (point.y > mapSize.height * 0.72 && candidate.dy > 0) score += 1.2;

   return score;
};

const comparePlacePriority = (left, right) => {
   const leftStorage = isStoragePlace(left.place);
   const rightStorage = isStoragePlace(right.place);

   if (leftStorage !== rightStorage) return leftStorage ? -1 : 1;

   const lengthDifference = left.place.name.length - right.place.name.length;
   if (lengthDifference !== 0) return lengthDifference;

   return left.index - right.index;
};

export function layoutPlaceLabels(
   places,
   { mapSize, preferredPlacements = new Map(), project, reservedRects = [], zoom }
) {
   const projectedPlaces = places
      .map((place, index) => ({
         index,
         place,
         point: toPoint(project(place))
      }))
      .filter(({ point }) => {
         return (
            point.x >= -VIEWPORT_PADDING &&
            point.y >= -VIEWPORT_PADDING &&
            point.x <= mapSize.width + VIEWPORT_PADDING &&
            point.y <= mapSize.height + VIEWPORT_PADDING
         );
      });
   const occupiedRects = [...reservedRects, ...projectedPlaces.map(createMarkerRect)];
   const labels = [];

   [...projectedPlaces].sort(comparePlacePriority).forEach(({ index, place, point }) => {
      const size = measureLabel(place, zoom);
      const rankedCandidates = LABEL_CANDIDATES.map(candidate => {
         const anchor = candidate.anchor(size);
         const rect = createRect(point, size, anchor);

         return {
            anchor,
            candidate,
            rect,
            score: getCandidateScore(candidate, point, mapSize)
         };
      }).sort((left, right) => {
         const preferredPlacement = preferredPlacements.get(place.id);
         const leftPreferred = left.candidate.placement === preferredPlacement;
         const rightPreferred = right.candidate.placement === preferredPlacement;

         if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;

         return left.score - right.score;
      });

      const match = rankedCandidates.find(({ rect }) => {
         const paddedRect = inflateRect(rect, getLabelPadding(place));

         return (
            isInsideViewport(paddedRect, mapSize) && !occupiedRects.some(occupied => rectsOverlap(paddedRect, occupied))
         );
      });

      if (!match) return;

      occupiedRects.push(inflateRect(match.rect, getLabelPadding(place)));
      labels.push({
         anchor: match.anchor,
         index,
         leader: match.candidate.leader,
         place,
         placement: match.candidate.placement,
         size
      });
   });

   return labels;
}
