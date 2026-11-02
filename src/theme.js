// design/theme.json(v7 (plan.json version 7))의 값을 그대로 옮긴 것이다. tools/gen-config.mjs 가 만든다 (직접 고치지 않는다).
// import 문이 없는 단순 모듈로 유지한다. (runner/validate-game.mjs 가 Node 에서 읽는다)
export const THEME = {
  "version": "v7 (plan.json version 7)",
  "palette": {
    "bg": "#CDEBC5",
    "primary": "#5BC0EB",
    "accent": "#FF9CB8",
    "danger": "#C74361",
    "text": "#3B5B4A",
    "textDim": "#4A6A58",
    "ink": "#2B4A3B",
    "cream": "#FFF8E8",
    "gold": "#FFC800",
    "mint": "#73D6AD",
    "sky": "#77C5E7",
    "rose": "#F29BB5",
    "dangerText": "#B8304F",
    "note": "text on bg 5.86:1, textDim on bg 4.66:1, ink on pastel green button face #73D6AD 5.57:1, on pastel blue #77C5E7 5.09:1, on grey kit face #DADCE7 7.17:1, dangerText on grey 4.30:1 (used at 26px+ only)"
  },
  "pastelize": {
    "why": "Human request + assets-review issue 2: Kenney UI colours and the lime AI floors are baked toward the pastel AI art. No new download; the yellow and red Kenney files are retired.",
    "method": "once per texture at load (canvas getImageData loop, then textures.addCanvas under the key '<key>@pastel'): 1) saturation matrix of the W3C feColorMatrix 'saturate' with s, 2) lift toward white: c = c * (1 - l) + l. Alpha untouched. CSS equivalent used by the mockups: filter: saturate(s) contrast((1-l)/(1+l)) brightness(1+l)",
    "matrix": "r' = (0.213+0.787s)R + (0.715-0.715s)G + (0.072-0.072s)B; g' = (0.213-0.213s)R + (0.715+0.285s)G + (0.072-0.072s)B; b' = (0.213-0.213s)R + (0.715-0.715s)G + (0.072+0.928s)B",
    "buttonUi": {
      "s": 1,
      "l": 0.4,
      "css": "saturate(1) contrast(.4286) brightness(1.4)",
      "result": {
        "greenFace": "#73D6AD",
        "greenBand": "#68A78D",
        "blueFace": "#77C5E7",
        "blueBand": "#72A3B7"
      },
      "textures": [
        "images/ui/ui-green-button-rectangle-depth-flat.png",
        "images/ui/ui-green-button-square-depth-flat.png",
        "images/ui/ui-green-button-round-depth-flat.png",
        "images/ui/ui-blue-button-rectangle-depth-flat.png",
        "images/ui/ui-blue-button-square-depth-flat.png",
        "images/ui/ui-blue-button-round-depth-flat.png",
        "images/ui/ui-green-button-rectangle-flat.png",
        "images/ui/ui-blue-icon-checkmark.png"
      ]
    },
    "floorLime": {
      "s": 0.8,
      "l": 0.12,
      "css": "saturate(.8) contrast(.7857) brightness(1.12)",
      "result": {
        "b1_grass_path #B9E64E": "#C6E57A",
        "b3_moss_floor #AED845": "#BCD972",
        "b5_leaf_floor #A4D44C": "#B4D676",
        "outline #3B5B4A": "#576D61"
      },
      "textures": [
        "images/ai/b1_grass_path.webp",
        "images/ai/b2_petal_path.webp",
        "images/ai/b3_moss_floor.webp",
        "images/ai/b4_stepping_stone.webp",
        "images/ai/b5_leaf_floor.webp"
      ],
      "note": "all 5 floor items get the same bake so the floors read as one family; decor and buildings are not baked (their grass base is part of the object)"
    },
    "dewNeutral": {
      "s": 0,
      "l": 0.45,
      "css": "saturate(0) contrast(.3793) brightness(1.45)",
      "textures": [
        "images/ai/dew_body.webp",
        "images/ai/dew_body_left.webp"
      ],
      "note": "colour skins only: a neutral light-grey copy of the body (key @neutral) so the plan skin tints (MULTIPLY) read as peach / mint / sunset / starlight instead of muddy blue. The default skin uses the original body"
    },
    "boardGrass": {
      "s": 0.85,
      "l": 0.06,
      "css": "saturate(.85) contrast(.8868) brightness(1.06)",
      "result": {
        "grass_a #C5ECB1": "#CCEBBC",
        "grass_b #B6E3A4": "#BFE3B0"
      },
      "textures": [
        "images/ai/grass_a.webp",
        "images/ai/grass_b.webp"
      ],
      "note": "then the chapter tint zones.<n>.grassTint is applied per cell with setTint (MULTIPLY)"
    },
    "buttonUiHi": {
      "s": 1,
      "l": 0.46,
      "css": "saturate(1) contrast(.3699) brightness(1.46)",
      "textures": "same as buttonUi, key @pastelHi (hover face)"
    },
    "greyHi": {
      "s": 1,
      "l": 0.06,
      "css": "saturate(1) contrast(.8868) brightness(1.06)",
      "textures": [
        "images/ui/ui-grey-button-rectangle-depth-flat.png",
        "images/ui/ui-grey-button-square-depth-flat.png",
        "images/ui/ui-grey-button-round-depth-flat.png"
      ],
      "note": "grey kit hover face, key @hi; the grey normal face is not baked"
    },
    "objectDay": {
      "s": 0.8,
      "l": 0.1,
      "css": "saturate(.8) contrast(.8182) brightness(1.1)",
      "textures": "all garden building _build and _day images, all 1x1 decor, overlay layers (blades, wheel, vane, flag, pinwheel head); also their art in S8 cards, S9 rows, S6 tray",
      "note": "design-review r1 issue 4: the lime base blocks painted in the AI images sit with the pastel floors and plot; building body colours keep most of their saturation"
    },
    "objectNight": {
      "s": 0.6,
      "l": 0.1,
      "css": "saturate(.6) contrast(.8182) brightness(1.1)",
      "then": "MULTIPLY tint.nightBase #D4DCF4",
      "textures": "all garden building _night images",
      "note": "pulls the saturated teal night base (#085868 family, assets-review issue 4) toward the blue-grey night plot; painted windows stay warm, the halo adds the glow"
    }
  },
  "tint": {
    "mode": "Phaser.TintModes.MULTIPLY unless noted (setTint(color))",
    "badgePink": "#FFA3C0",
    "barGold": "#FFE070",
    "petalB": "#FFB3CC",
    "hintEmpty": "#888888",
    "cloudNight": {
      "color": "#6A78B0",
      "alpha": 0.25
    },
    "garden": {
      "dawn": "#FFE4D0",
      "day": "#FFFFFF",
      "dusk": "#FFC89A",
      "night": "#8C96D0"
    },
    "friendNight": "#C8D0F0",
    "skins": {
      "skin_peach": "#FFC7A8",
      "skin_mint": "#B5F0D6",
      "skin_sunset": "#FFB07C",
      "skin_starlight": "#9FB4FF",
      "skin_rainbow": "hue cycle 6000ms (Phaser.Display.Color.HSVToRGB(t, 0.32, 1))"
    },
    "nightBase": "#D4DCF4",
    "inkFill": {
      "color": "#2B4A3B",
      "mode": "Phaser.TintModes.FILL",
      "textures": [
        "images/ui/ui-extra-icon-play-dark.png",
        "images/ui/ui-extra-icon-repeat-dark.png"
      ],
      "note": "design-review r1 issue 2: the Kenney -dark glyphs are pure black; FILL keeps the glyph alpha and paints it ink like the labels and code icons. MULTIPLY cannot lighten black"
    }
  },
  "zones": {
    "1": {
      "name": "branch.name1",
      "sky": [
        "#BFE6F5",
        "#E4F5E4",
        "#E4F5E4"
      ],
      "ground": [
        "#CDEBC5",
        "#B3DDA8"
      ],
      "far": [
        "#A9D9B4",
        "#93CBA0"
      ],
      "hedge": [
        "#86C77E",
        "#62AE6A"
      ],
      "leaf": "#7FC07A",
      "board": [
        "#93CE84",
        "#6FAE66"
      ],
      "boardEdge": "#4F8A55",
      "grassTint": "#FFFFFF",
      "mote": "#FFFFFF",
      "icon": "images/ai/flower_3_bloom.webp"
    },
    "2": {
      "name": "branch.name2",
      "sky": [
        "#FFD9C0",
        "#F7E1E6",
        "#EEDDF0"
      ],
      "ground": [
        "#EFE3C6",
        "#E2CFA9"
      ],
      "far": [
        "#E9C2C8",
        "#D9A9BC"
      ],
      "hedge": [
        "#C9B07E",
        "#B08F63"
      ],
      "leaf": "#E79AB1",
      "board": [
        "#E9BC9A",
        "#CF9878"
      ],
      "boardEdge": "#9C6A5A",
      "grassTint": "#FFF1E6",
      "mote": "#FFC2D4",
      "icon": "images/ai/petal_portal.webp"
    },
    "3": {
      "name": "branch.name3",
      "sky": [
        "#BFE0D0",
        "#D9ECDC",
        "#E6F0DA"
      ],
      "ground": [
        "#C4DDB7",
        "#A7C99C"
      ],
      "far": [
        "#8FBFA9",
        "#76AA94"
      ],
      "hedge": [
        "#6FA77F",
        "#548C68"
      ],
      "leaf": "#5E9C72",
      "board": [
        "#8DBB8F",
        "#6C9A72"
      ],
      "boardEdge": "#4E7559",
      "grassTint": "#EEF6EC",
      "mote": "#FFF0A8",
      "icon": "images/ai/mushroom.webp"
    },
    "4": {
      "name": "branch.name4",
      "sky": [
        "#BDE8EC",
        "#DDF4F1",
        "#E7F6E8"
      ],
      "ground": [
        "#CBE9C8",
        "#A9D8C2"
      ],
      "far": [
        "#9FD3CC",
        "#84C2BC"
      ],
      "hedge": [
        "#76C2AE",
        "#52A592"
      ],
      "leaf": "#6CBFA6",
      "board": [
        "#7FC6B5",
        "#5AA897"
      ],
      "boardEdge": "#3D8580",
      "grassTint": "#EEF8FA",
      "mote": "#E6FAFF",
      "icon": "images/ai/frog.webp"
    },
    "5": {
      "name": "branch.name5",
      "sky": [
        "#3E4C7A",
        "#8E7FB0",
        "#F4C79A"
      ],
      "ground": [
        "#D6DDB0",
        "#B9C493"
      ],
      "far": [
        "#6E6F9E",
        "#5A5C8A"
      ],
      "hedge": [
        "#9CAB78",
        "#7D8D5E"
      ],
      "leaf": "#C9A65A",
      "board": [
        "#A9B98C",
        "#88986E"
      ],
      "boardEdge": "#4C5A86",
      "grassTint": "#F5F2E6",
      "mote": "#FFE7A6",
      "icon": "images/ai/moon.webp",
      "note": "dusk-to-night sky stays above y 400 only; board and HUD panels are bright so text contrast never depends on the dark sky"
    }
  },
  "gradients": {
    "bg": {
      "angleDeg": 180,
      "stops": [
        [
          "zones.n.sky[0]",
          0
        ],
        [
          "zones.n.sky[1]",
          0.26
        ],
        [
          "zones.n.sky[2]",
          0.4
        ],
        [
          "zones.n.ground[0]",
          0.62
        ],
        [
          "zones.n.ground[1]",
          1
        ]
      ]
    },
    "board": {
      "angleDeg": 180,
      "stops": [
        [
          "zones.n.board[0]",
          0
        ],
        [
          "zones.n.board[1]",
          1
        ]
      ]
    },
    "toast": {
      "angleDeg": 180,
      "stops": [
        [
          "#FFFDF5",
          0
        ],
        [
          "#FFF1CF",
          1
        ]
      ]
    },
    "bubble": {
      "angleDeg": 180,
      "stops": [
        [
          "#FFFDF2",
          0
        ],
        [
          "#FFF1C2",
          1
        ]
      ]
    },
    "ribbonMint": {
      "angleDeg": 180,
      "stops": [
        [
          "#9EE3C4",
          0
        ],
        [
          "#5CC39A",
          1
        ]
      ]
    },
    "ribbonPink": {
      "angleDeg": 180,
      "stops": [
        [
          "#FFC4D6",
          0
        ],
        [
          "#F38FB0",
          1
        ]
      ]
    },
    "ribbonSky": {
      "angleDeg": 180,
      "stops": [
        [
          "#B9E6F8",
          0
        ],
        [
          "#73C3E8",
          1
        ]
      ]
    },
    "ribbonGold": {
      "angleDeg": 180,
      "stops": [
        [
          "#FFF0A8",
          0
        ],
        [
          "#F7CF4A",
          1
        ]
      ]
    },
    "chipGold": {
      "angleDeg": 180,
      "stops": [
        [
          "#FFF6C4",
          0
        ],
        [
          "#FFE07A",
          1
        ]
      ]
    },
    "chipMint": {
      "angleDeg": 180,
      "stops": [
        [
          "#E3F8EC",
          0
        ],
        [
          "#B9EBD1",
          1
        ]
      ]
    },
    "chipRose": {
      "angleDeg": 180,
      "stops": [
        [
          "#FFEFF4",
          0
        ],
        [
          "#FFD3E0",
          1
        ]
      ]
    }
  },
  "fonts": {
    "title": {
      "file": "fonts/jua.woff2",
      "sizePx": 72,
      "note": "Jua is the single confirmed family (story 2-2, OFL 1.1). Gowun Dodum and Gaegu are not used. Title: white fill, 10px #3B5B4A stroke, 7px #3B5B4A drop"
    },
    "score": {
      "file": "fonts/jua.woff2",
      "sizePx": 44
    },
    "body": {
      "file": "fonts/jua.woff2",
      "sizePx": 20
    },
    "button": {
      "file": "fonts/jua.woff2",
      "sizePx": 26
    }
  },
  "fontSizesPx": {
    "title": 72,
    "heading": 40,
    "headingSmall": 30,
    "score": 44,
    "buttonXL": 34,
    "button": 26,
    "buttonSmall": 20,
    "buttonXS": 18,
    "body": 20,
    "caption": 18,
    "min": 14
  },
  "spacingUnitPx": 8,
  "radiusPx": {
    "button": 14,
    "panel": 20,
    "cell": 14,
    "board": 30,
    "toast": 24,
    "bubble": 22,
    "chip": 20
  },
  "nineSlice": {
    "rule": "source corner : display corner = 2 : 1 everywhere (no fractional slice edges); slices drawn from the baked texture; check the seams after every bake change at 1x and at the desktop scale",
    "buttonRect": {
      "source": "384x128",
      "cornerPx": 32,
      "displayCornerPx": 16
    },
    "square": {
      "source": "128x128",
      "cornerPx": 32,
      "displayCornerPx": 16
    },
    "barFlat": {
      "source": "384x128",
      "cornerPx": 24,
      "displayCornerPx": 12
    }
  },
  "shadow": {
    "ui": {
      "x": 0,
      "y": 6,
      "decay": 0.1,
      "power": 1.4,
      "color": "#2B4A3B",
      "intensity": 0.3
    },
    "object": {
      "x": 0,
      "y": 4,
      "decay": 0.1,
      "power": 1.2,
      "color": "#2B4A3B",
      "intensity": 0.25
    },
    "toast": {
      "x": 0,
      "y": 7,
      "decay": 0.1,
      "power": 1.4,
      "color": "#2B4A3B",
      "intensity": 0.32
    }
  },
  "glow": {
    "accent": {
      "color": "#FF9CB8",
      "outerStrength": 4,
      "innerStrength": 0
    },
    "dew": {
      "color": "#8EE0FF",
      "outerStrength": 3,
      "innerStrength": 0
    },
    "gold": {
      "color": "#FFE98A",
      "outerStrength": 5,
      "innerStrength": 0
    },
    "hint": {
      "color": "#FFE98A",
      "outerStrength": 4,
      "innerStrength": 0
    },
    "hintOn": {
      "color": "#8EE0FF",
      "outerStrength": 4,
      "innerStrength": 0
    },
    "perfectTile": {
      "color": "#FFD646",
      "outerStrength": 4,
      "innerStrength": 0
    },
    "needTile": {
      "color": "#FFF8C8",
      "outerStrength": 4,
      "innerStrength": 0
    },
    "selected": {
      "color": "#FFFFFF",
      "outerStrength": 6,
      "innerStrength": 0
    },
    "pulse": {
      "color": "#FFF3B0",
      "outerStrength": 5,
      "innerStrength": 0,
      "note": "pulse outline 4px #FFF3B0 at 7px outside the button, alpha .35<->1 (motion pulse)"
    }
  },
  "codeIcons": {
    "sizePx": 48,
    "strokePx": 5,
    "color": "#2B4A3B",
    "disabledColor": "rgba(43,74,59,.45)",
    "list": [
      "undo",
      "pause",
      "back",
      "zoom",
      "flip",
      "store",
      "hand",
      "share",
      "sfx",
      "music",
      "globe",
      "trash",
      "book",
      "gear"
    ],
    "source": "design/src/lib.mjs codeIcon() paths, 48px viewBox"
  },
  "themeParticles": {
    "note": "Human-approved code-drawn particle textures (plan 3-12-8 fx_* have no image). Bake each once with Graphics -> generateTexture(key, sizePx, sizePx), centred, transparent background. Emitter values (speed, count, life) stay as plan 3-12-8; alpha below is the texture fill alpha, the emitter adds its own fades.",
    "fx_dew_mote": {
      "theme": "theme_default",
      "sizePx": 16,
      "shape": "circle r6 radial: centre #FFFFFF alpha 1 -> edge alpha 0 (3 rings: r2 a1, r4 a.6, r6 a.2)",
      "color": "#FFFFFF",
      "alpha": 0.9,
      "tintByChapter": "zones.<n>.mote (setTint)"
    },
    "fx_blossom": {
      "theme": "theme_blossom",
      "sizePx": 20,
      "shape": "petal: ellipse 8x14 rotated 0, notch at the top = two arcs; fill #FFB3C9, 1.5px stroke #FFFFFF alpha .9",
      "color": "#FFB3C9",
      "altColor": "#FFC9D8",
      "alpha": 1
    },
    "fx_star_twinkle": {
      "theme": "theme_starnight",
      "sizePx": 20,
      "shape": "5-point star outer r9 inner r4, fill #FFF2A8, 4px glow ring alpha .25",
      "color": "#FFF2A8",
      "alpha": 1
    },
    "fx_snow": {
      "theme": "theme_snowflake",
      "sizePx": 24,
      "shape": "6 arms length 10 from centre, lineWidth 3 round caps, small branch 3px at 60% of each arm; centre dot r2",
      "color": "#FFFFFF",
      "alpha": 0.95
    },
    "fx_sprinkle": {
      "theme": "theme_candy",
      "sizePx": 16,
      "shape": "rounded bar 14x5 radius 2.5 (3 textures by colour)",
      "colors": [
        "#FF8FB8",
        "#7FD8B8",
        "#FFD36E"
      ],
      "alpha": 1
    },
    "fx_cloud_puff": {
      "theme": "theme_rainbowcloud",
      "sizePx": 36,
      "shape": "3 overlapping circles r8/r11/r8 at x -10/0/+10, flat bottom ellipse 32x12",
      "color": "#FFFFFF",
      "altColor": "#FFE3EE",
      "alpha": 0.9
    }
  },
  "themes": {
    "theme_default": {
      "sky": "zones",
      "grassTint": "zones"
    },
    "theme_blossom": {
      "sky": [
        "#FFD6E4",
        "#FFEFF4",
        "#F3E6EA"
      ],
      "grassTint": "#FFF1F5"
    },
    "theme_starnight": {
      "sky": [
        "#26305E",
        "#5B5E9E",
        "#C9CFEA"
      ],
      "grassTint": "#E8EBFA"
    },
    "theme_snowflake": {
      "sky": [
        "#CFE8F7",
        "#F2FAFF",
        "#E5F1F5"
      ],
      "grassTint": "#F4FBFF"
    },
    "theme_candy": {
      "sky": [
        "#FFD3E8",
        "#D9F5EC",
        "#FCE8F0"
      ],
      "grassTint": "#FFF4F8"
    },
    "theme_rainbowcloud": {
      "sky": [
        "#C9E4FF",
        "#FFE9F2",
        "#EAF2FF"
      ],
      "grassTint": "#F6F2FF"
    }
  },
  "dew": {
    "imageBoxPx": {
      "play": 92,
      "menu": 148,
      "garden": 54,
      "shopCard": 100
    },
    "bodyRatio": 0.684,
    "note": "dewBodySizePx 64 (plan 3-8) is the visible body: the 256px image has a 175px wide body, so the image is drawn at 92px (body 63px). Origin bottom-centre (0.5, 0.89). Play: image top-left = cell top-left - 6px",
    "faceBoxInImage": {
      "x": 0.156,
      "y": 0,
      "w": 0.684,
      "h": 1,
      "viewBox": "64 x 93.6",
      "unitSourcePx": 2.734,
      "note": "face units = display px of a 64px body (plan 3-8). The box spans the body width at its widest bulb (dew_body.webp alpha x 40-215 of 256 at y 168 incl. arms; bulb x 55-200 at y 128-144, centre x 127.5) and the full image height, so 1 unit = 2.734 source px in both axes. Face centre x 32 = source x 127.5 = horizontal centre of the widest part"
    },
    "face": {
      "eyeRx": 3.5,
      "eyeRy": 4.5,
      "eyeGap": 18,
      "eyeY": 44.6,
      "eyeColor": "#2A3A4A",
      "highlight": {
        "r": 1.1,
        "dx": 1.5,
        "dy": -2,
        "color": "#FFFFFF"
      },
      "cheek": {
        "rx": 4,
        "ry": 2.5,
        "dx": 6,
        "dy": 9,
        "color": "#FF9FB0",
        "alpha": 0.5,
        "alphaSmile": 0.9
      },
      "brow": {
        "len": 8,
        "width": 2,
        "dy": -9,
        "angleDeg": 20
      },
      "mouth": {
        "dy": 8,
        "width": 2,
        "smile": [
          8,
          3
        ],
        "bigSmile": [
          10,
          5
        ],
        "oRadius": 2.5,
        "wave": [
          8,
          1.5
        ],
        "open": 10
      },
      "gazePx": 3,
      "gardenGazePx": 2,
      "side": {
        "eyeGap": 10,
        "shift": -6,
        "eyeRx": 3,
        "mouthShift": -4,
        "mouthHalfWidth": 3,
        "cheeks": 1
      },
      "anchorNote": "eyes at source y 122 (body alpha y 25-227, feet from y 190: bulb middle about 108, eyes slightly below it). Margins at the cheek line (source y 147, body x 55-200): left cheek outer edge source x 75.5, right 179.5 -> 20.5 px inside the outline on both sides. Front face never uses side.shift; side (dew_body_left, body x 64-189) uses shift -6 so the eyes sit toward the travel side: eyes source x 97 / 125, forward cheek 84, all inside x 66-187 at that height"
    },
    "hatAnchor": {
      "x": 0.28,
      "y": -0.06,
      "w": 0.44,
      "rotationDeg": -6,
      "followLagMs": 60
    },
    "bodyAlpha": {
      "dew_body": {
        "top": 25,
        "bottom": 227,
        "widestY": 168,
        "widestX": [
          41,
          214
        ],
        "bulbX": [
          55,
          200
        ],
        "bulbY": [
          128,
          144
        ],
        "centreX": 127.5
      },
      "dew_body_left": {
        "top": 35,
        "bottom": 221,
        "widestY": 126,
        "widestX": [
          64,
          189
        ],
        "centreX": 127
      }
    },
    "rig": {
      "note": "animation-review r1 issue 7: the face follows the body position during squash, stretch, hop and turn, not only its scale",
      "structure": "dewRoot Container (position on the board / garden, hop y, nudge x) > facing Container (scaleX +1, or -1 for right-facing dew_body_left; nothing else is ever tweened on it) > bodyRig Container at the body origin (bottom-centre, 0.5 / 0.89 of the image) > [body Image, faceRig Container, hat Image]",
      "bodyRig": "every squash / stretch / breathe / turn-press tween sets bodyRig.scaleX / scaleY only (sx, sy). Because the face lives inside bodyRig, its anchor (unit point 32, 44.6 = source 127.5, 122) moves with the deformed body every frame with no per-frame code",
      "faceRig": "faceRig.x/y = face anchor relative to the body origin: x = 0, y = (122/256 - 0.89) * imageBoxPx. Counter-scale so the face deforms only half as much (plan dewFaceFollowRatio .5): faceRig.scaleX = (1 + (sx - 1) * 0.5) / sx, faceRig.scaleY = (1 + (sy - 1) * 0.5) / sy, set in the same tween onUpdate",
      "hat": "hat Image inside bodyRig at theme.dew.hatAnchor, its 60ms follow lag = a separate angle / y tween on the hat only",
      "mockup": "mockups apply the same rule: the face wrapper is inside the stretched body box and scales 1 + (s - 1) * .5 around the bottom-centre (lib.mjs dew())",
      "facing": "animation-review minor 10: the rightward flip lives only on the facing level, so bodyRig sx / sy and the faceRig counter-scale (1 + (s - 1) * .5) / s are always computed from positive values. Swap the body texture and set facing.scaleX on the body-swap frame (plan 3-8), then run the 80ms turn press on bodyRig"
    }
  },
  "board": {
    "frame": {
      "x": 18,
      "y": 212,
      "w": 504,
      "h": 504,
      "radius": 30,
      "edgePx": 5,
      "innerHighlight": "rgba(255,255,255,.35) 4px top",
      "drop": "0 10px 0 rgba(43,74,59,.18)"
    },
    "grid": {
      "x": 30,
      "y": 224,
      "cellPx": 80,
      "cellRadius": 14,
      "cellLine": "rgba(43,74,59,.07) 1px"
    },
    "objects": {
      "rock": [
        80,
        80,
        0,
        0
      ],
      "tree": [
        84,
        84,
        -2,
        -8
      ],
      "dirt": [
        80,
        80,
        0,
        0
      ],
      "flowerBud": [
        66,
        76,
        7,
        0
      ],
      "flowerBloom": [
        70,
        80,
        5,
        -2
      ],
      "ice": [
        80,
        80,
        0,
        0
      ],
      "puddle": [
        80,
        80,
        0,
        0
      ],
      "petal": [
        80,
        80,
        0,
        0
      ],
      "arrowLeaf": [
        76,
        76,
        2,
        2,
        "rotation: > 0, v 90, < 180, ^ -90"
      ],
      "mushroom": [
        80,
        80,
        0,
        -2
      ],
      "pot": [
        80,
        80,
        0,
        -2
      ],
      "acorn": [
        74,
        74,
        3,
        2
      ],
      "frog": [
        80,
        80,
        0,
        -2
      ],
      "format": "[w, h, dx, dy] from the cell top-left"
    }
  },
  "garden": {
    "tile": {
      "w": 64,
      "h": 32
    },
    "origin8": {
      "x": 270,
      "y": 372,
      "note": "top vertex of tile (0,0) at zoom 1; screen = origin + ((x-y)*32, (x+y)*16)*zoom; bigger plots keep the plot centre at y 500"
    },
    "plot": {
      "topA": "#CFEDBC",
      "topB": "#C3E6AE",
      "tileLine": "#B2D99C",
      "sideLeft": "#9BCF84",
      "sideRight": "#83BC6E",
      "soilLeft": "#C99A6C",
      "soilRight": "#A97E55",
      "rim": "#5E9A63",
      "grassDepthPx": 14,
      "soilDepthPx": 18,
      "shadow": "ellipse rgba(20,30,60,.18)",
      "tint": "multiply by tint.garden.<period>"
    },
    "items": {
      "buildingWidthPx": 140,
      "buildingBottomRatio": 0.965,
      "decorWidthPx": 72,
      "decorBottomRatio": 0.917,
      "floorWidthPx": 70,
      "floorBottomRatio": 0.83,
      "friendPx": 46,
      "dewPx": 54,
      "rule": "image bottom vertex (ratio x width) sits on the footprint bottom vertex + 4px (building), + 3px (decor), + 2px (floor)",
      "bake": "objectDay for _build/_day/decor/overlays, objectNight + nightBase for _night, floorLime for floors (theme.pastelize)"
    },
    "depth": "(x + y) * 10 + layer (floor 0, object 5, resident 6); 2x2 uses (x+1, y+1)",
    "windowLights": {
      "sourcePx": 256,
      "radiusPx": 10,
      "color": "#FFD27A",
      "alpha": [
        0.75,
        1
      ],
      "glowAlpha": 0.38,
      "blend": "ADD",
      "anchors": {
        "b1_gardener_hut": [
          [
            105,
            105
          ],
          [
            183,
            150
          ]
        ],
        "b1_veggie_patch": [
          [
            38,
            125
          ]
        ],
        "b2_flower_shop": [
          [
            108,
            150
          ],
          [
            185,
            152
          ]
        ],
        "b2_windmill": [
          [
            120,
            73
          ]
        ],
        "b3_mushroom_house": [
          [
            175,
            150
          ],
          [
            65,
            145
          ]
        ],
        "b3_tree_swing": [
          [
            88,
            139
          ]
        ],
        "b4_pavilion": [
          [
            47,
            73
          ],
          [
            206,
            73
          ]
        ],
        "b4_water_mill": [
          [
            105,
            105
          ]
        ],
        "b5_wind_tower": [
          [
            107,
            112
          ]
        ],
        "b5_squirrel_house": [
          [
            115,
            105
          ],
          [
            60,
            117
          ]
        ]
      },
      "note": "assets-review issue 4: the _night images already have painted yellow windows. The code light is only a soft halo on the painted window anchors so the light never doubles; no extra sparkle particles at night. Radius 10 = plan windowLightSizePx",
      "render": "one radial gradient texture (64px, white centre alpha 1 -> transparent edge) baked once on a canvas; each halo is an Image with setTint(0xFFD27A), setBlendMode(ADD), scale = 2 * radiusPx / 64. Rendered alpha = (that building _night layer alpha) x glowAlpha .38 x flicker"
    },
    "lampGlow": {
      "radiusPx": 48,
      "color": "#FFD27A",
      "blend": "ADD",
      "alpha": {
        "dawn": 0.2,
        "day": 0,
        "dusk": 0.25,
        "night": 0.5
      },
      "flicker": "+0.1, 2000ms",
      "items": [
        "b2_petal_lamp",
        "b3_mushroom_lamp",
        "b4_stone_lantern",
        "b3_firefly_jar"
      ],
      "render": "same gradient texture as the window halo, scale 2 * 48 / 64, setTint(0xFFD27A), ADD"
    },
    "overlays": {
      "format": "[image, pivot x, pivot y in source px of the 256px building (192 for decor), display size in source px, motion]",
      "b2_windmill": [
        "images/ai/b2_windmill_blades.webp",
        117,
        77,
        168,
        "rotate 60deg/s"
      ],
      "b4_water_mill": [
        "images/ai/b4_water_mill_wheel.webp",
        190,
        150,
        110,
        "rotate 30deg/s"
      ],
      "b5_wind_tower": [
        "images/ai/b5_wind_tower_vane.webp",
        128,
        12,
        96,
        "rotation +-25deg 3000ms"
      ],
      "b2_flower_shop": [
        "images/ai/fx_flag.webp",
        96,
        38,
        70,
        "rotation +-8deg 1400ms"
      ],
      "b4_pavilion": [
        "images/ai/fx_flag.webp",
        127,
        18,
        70,
        "rotation +-8deg 1400ms"
      ],
      "b5_pinwheel": [
        "images/ai/b5_pinwheel_head.webp",
        96,
        50,
        90,
        "rotate 90deg/s"
      ],
      "night": "overlays get the night tint #8C96D0 (they have no _night image); hidden while a building is in _build"
    },
    "buildAlignment": {
      "note": "assets-review issue 3: _build silhouettes differ from _day/_night (scaffolding). All three states share one origin = bottom vertex of the block (0.5, 0.965) so the base never moves. _build -> period image (different silhouettes, 300ms): symmetric crossfade, _build 1 -> 0 and the new image 0 -> 1. Same-silhouette _day <-> _night (1500ms): the incoming image is drawn on top and fades 0 -> 1, the outgoing stays at alpha 1 underneath and is hidden at the end (no see-through at the midpoint)",
      "origin": [
        0.5,
        0.965
      ]
    },
    "periods": {
      "dawn": {
        "sky": [
          "#FFD9C4",
          "#A9C9EE"
        ],
        "sun": {
          "x": 50,
          "y": 236,
          "size": 96,
          "alpha": 0.9
        },
        "buildings": "_day + tint #FFE4D0",
        "label": "garden.timeDawn"
      },
      "day": {
        "sky": [
          "#8FD3FF",
          "#E9F9D9"
        ],
        "sun": {
          "x": 44,
          "y": 104,
          "size": 112,
          "alpha": 1
        },
        "buildings": "_day",
        "label": "garden.timeDay"
      },
      "dusk": {
        "sky": [
          "#FF9F7A",
          "#6A4F9C"
        ],
        "sun": {
          "x": 404,
          "y": 214,
          "size": 100,
          "alpha": 0.9
        },
        "buildings": "_day + tint #FFC89A",
        "label": "garden.timeDusk"
      },
      "night": {
        "sky": [
          "#12183A",
          "#2A3B6C"
        ],
        "moon": {
          "x": 48,
          "y": 104,
          "size": 100,
          "glow": "rgba(255,240,180,.6) 14px"
        },
        "buildings": "_night",
        "stars": 24,
        "label": "garden.timeNight"
      },
      "skyStop": 0.72,
      "clouds": [
        [
          170,
          120,
          120
        ],
        [
          380,
          190,
          100
        ],
        [
          10,
          262,
          84
        ]
      ],
      "timeBadge": {
        "right": 20,
        "y": 96,
        "h": 44,
        "icon": "sun.webp / moon.webp 32px",
        "night": "bg rgba(32,42,84,.78), text #FFF6DA (11.6:1)"
      }
    }
  },
  "layout": {
    "baseWidthPx": 540,
    "baseHeightPx": 960,
    "safeMarginPx": 20,
    "touchMinPx": 44,
    "adSlotPx": {
      "w": 320,
      "h": 50,
      "outsideCanvas": true,
      "resultOnly": true
    },
    "topBar": {
      "back": [
        20,
        20,
        132,
        64
      ],
      "title": {
        "x": 150,
        "w": 240,
        "y": 30,
        "sizePx": 36
      },
      "coins": [
        390,
        20,
        130,
        64
      ]
    },
    "play": {
      "pause": [
        20,
        20,
        64
      ],
      "stage": [
        96,
        20,
        120,
        64
      ],
      "stars": [
        228,
        20,
        164,
        64
      ],
      "coins": [
        404,
        20,
        116,
        64
      ],
      "moves": [
        24,
        96,
        240,
        58
      ],
      "flowers": [
        276,
        96,
        240,
        58
      ],
      "toastY": 160,
      "board": [
        18,
        212,
        504,
        504
      ],
      "undo": [
        24,
        736,
        124,
        84
      ],
      "restart": [
        24,
        834,
        124,
        84
      ],
      "hint": [
        392,
        736,
        124,
        182
      ],
      "hintBadge": [
        484,
        724,
        40
      ],
      "dpad": {
        "size": 72,
        "up": [
          234,
          734
        ],
        "left": [
          156,
          806
        ],
        "right": [
          312,
          806
        ],
        "down": [
          234,
          878
        ]
      },
      "tutorialCard": [
        30,
        620,
        480,
        96
      ],
      "bottomToastY": 652
    },
    "stageselect": {
      "prev": [
        20,
        100,
        64
      ],
      "name": [
        96,
        96,
        348,
        72
      ],
      "next": [
        456,
        100,
        64
      ],
      "statsY": 184,
      "bar": [
        30,
        238,
        480,
        26
      ],
      "grid": {
        "x": 30,
        "y": 286,
        "tile": 88,
        "colStep": 98,
        "rowStep": 100,
        "cols": 5,
        "clip": [
          0,
          268,
          540,
          530
        ]
      },
      "helpY": 808,
      "shop": [
        24,
        852,
        236,
        84
      ],
      "pass": [
        280,
        852,
        236,
        84
      ]
    },
    "result": {
      "panel": [
        30,
        36,
        480,
        648
      ],
      "stars": [
        [
          120,
          128,
          96
        ],
        [
          222,
          104,
          112
        ],
        [
          336,
          128,
          96
        ]
      ],
      "next": [
        90,
        700,
        360,
        92
      ],
      "retry": [
        30,
        802,
        236,
        72
      ],
      "share": [
        274,
        802,
        236,
        72
      ],
      "small": [
        [
          30,
          884
        ],
        [
          194,
          884
        ],
        [
          358,
          884
        ],
        152,
        62
      ],
      "passBar": [
        60,
        520,
        420,
        26
      ],
      "adLetterbox": "the 540x960 canvas is scaled to fit above the 320x50 ad slot (R15: ad outside the canvas). On narrow (mobile) viewports the page background beside it = zones.<n>.ground[1] so the side bands read as ground; on desktop the page keeps the shared dark vignette like every other screen"
    },
    "shop": {
      "tabs": {
        "x": 30,
        "y": 100,
        "w": 114,
        "h": 62,
        "step": 122
      },
      "hintCard": [
        30,
        180,
        480,
        456
      ],
      "buy": [
        90,
        466,
        360,
        96
      ],
      "statusY": 578,
      "earnCard": [
        30,
        660,
        480,
        150
      ],
      "itemGrid": [
        [
          30,
          180
        ],
        [
          278,
          180
        ],
        [
          30,
          412
        ],
        [
          278,
          412
        ],
        [
          30,
          644
        ],
        [
          278,
          644
        ]
      ],
      "itemCard": [
        232,
        220
      ]
    },
    "pass": {
      "tabs": {
        "x": 30,
        "y": 100,
        "w": 92,
        "h": 62,
        "step": 98
      },
      "progress": [
        30,
        176,
        480,
        124
      ],
      "claimAll": [
        150,
        310,
        240,
        70
      ],
      "rows": {
        "x": 30,
        "y": 396,
        "w": 480,
        "h": 86,
        "step": 92,
        "visible": 5
      },
      "toGarden": [
        130,
        868,
        280,
        72
      ]
    },
    "garden": {
      "edit": [
        24,
        862,
        200,
        76
      ],
      "zoom": [
        236,
        862,
        110,
        76
      ],
      "shop": [
        358,
        862,
        158,
        76
      ],
      "done": [
        20,
        100,
        140,
        60
      ],
      "tray": [
        10,
        774,
        520,
        172
      ],
      "trayItem": {
        "x": 24,
        "step": 160,
        "w": 150,
        "h": 140
      },
      "plotChip": [
        164,
        32
      ]
    },
    "clouds": "AI clouds only in open sky (S1, S2 top bar gap, S4, S5, S7, S6 sky); none behind or under HUD rows and tab bars (S3, S8, S9). cloudDrift wraps above y 300 on S1/S4/S5/S7 and never crosses a panel"
  },
  "motionMs": {
    "buttonPress": 80,
    "buttonHover": 120,
    "buttonRelease": 120,
    "screenFade": 250,
    "panelPop": 280,
    "pulse": 1000,
    "badgePulse": 1000,
    "nudge": 240,
    "toast": 1500,
    "toastFade": 150,
    "dewBreath": 800,
    "dewBlink": 120,
    "dewStretch": 60,
    "dewTurn": 80,
    "dewStopSquash": 120,
    "dewStopRecover": 100,
    "dewBloomPop": 150,
    "dewBlocked": 400,
    "dewHop": 220,
    "dewTeleport": 150,
    "dewClearHop": 400,
    "dewGardenHop": 600,
    "dewGardenLand": 100,
    "hatFollow": 240,
    "skinApply": 400,
    "cellSlide": 71,
    "slideMin": 120,
    "bloomStep": 100,
    "bloomPop": 200,
    "squash": 120,
    "rockBump": 120,
    "treeBump": 200,
    "dirtWet": 120,
    "dirtCrumble": 250,
    "iceCrack": 80,
    "iceBreak": 200,
    "puddleRipple": 2200,
    "petalPortal": 160,
    "petalSpin": 9000,
    "leafTurn": 200,
    "mushroomBounce": 320,
    "potStop": 100,
    "acornSquash": 80,
    "frogHop": 220,
    "frogLand": 80,
    "undo": 150,
    "shake": 120,
    "chainPop": 280,
    "banner": 2000,
    "branchBanner": 2000,
    "starStep": 300,
    "starLostFade": 200,
    "perfectBadge": 400,
    "clearToResult": 1200,
    "resultNewBestAt": 900,
    "resultCoinAt": 1100,
    "resultUnlockAt": 1700,
    "passBarFill": 600,
    "passLevelPop": 280,
    "coinPop": 400,
    "coinCount": 500,
    "buyFly": 600,
    "buyCountPop": 280,
    "badgePop": 200,
    "guideFadeIn": 150,
    "guideFadeOut": 150,
    "guidePulse": 900,
    "swipeGuide": 900,
    "tooltip": 2000,
    "hintDisplay": 4000,
    "hintDraw": 220,
    "hintRing": 500,
    "hintPulse": 500,
    "hintDash": 900,
    "hintRewindStep": 150,
    "hintGhost": 300,
    "hintRewoundNotice": 2500,
    "interactMark": 600,
    "cardDelay": 2000,
    "cardSlideIn": 200,
    "cardSlideOut": 200,
    "cardMax": 6000,
    "cardDemo": 900,
    "cardDemoGap": 600,
    "passBoxIdle": 1000,
    "passBoxShake": 200,
    "passRewardFly": 500,
    "unlockLock": 350,
    "crownSparkle": 3000,
    "gardenPick": 120,
    "gardenPlace": 150,
    "gardenFailReturn": 200,
    "gardenZoom": 250,
    "plotExpand": 600,
    "residentTap": 300,
    "buildDuration": 3000,
    "buildShakePeriod": 160,
    "buildDustEvery": 150,
    "buildDustLife": 600,
    "buildFade": 300,
    "buildHopUp": 160,
    "buildHopDown": 190,
    "buildSparkleLife": 500,
    "buildTapPop": 100,
    "buildToast": 1200,
    "skyFade": 3000,
    "buildingFade": 1500,
    "buildingFadeStagger": 100,
    "nightHintDelay": 400,
    "nightHint": 2500,
    "lampFlicker": 1000,
    "cloudDrift": 60000,
    "smokeLife": 2000,
    "bladeSpin": 6000,
    "wheelSpin": 12000,
    "vaneSwing": 3000,
    "flagSway": 1400,
    "decorSway": 2400,
    "bgMid": 12000,
    "bgFront": 9000,
    "windowFlickerMin": 1200,
    "windowFlickerMax": 3200,
    "starTwinkleMin": 1500,
    "starTwinkleMax": 3000,
    "gardenReturnFade": 300,
    "buildShakeStop": 60,
    "buildOverlayIn": 300,
    "hintBulbGlow": 800
  },
  "easing": {
    "buttonPress": "Quad.easeOut",
    "buttonHover": "Sine.easeOut",
    "buttonRelease": "Back.easeOut",
    "screenFade": "Sine.easeInOut",
    "panelPop": "Back.easeOut",
    "pulse": "Sine.easeInOut",
    "badgePulse": "Sine.easeInOut",
    "nudge": "Sine.easeInOut",
    "toast": "Linear",
    "toastFade": "Sine.easeOut",
    "dewBreath": "Sine.easeInOut",
    "dewBlink": "Quad.easeInOut",
    "dewStretch": "Quad.easeOut",
    "dewTurn": "Quad.easeOut",
    "dewStopSquash": "Quad.easeOut",
    "dewStopRecover": "Back.easeOut",
    "dewBloomPop": "Back.easeOut",
    "dewBlocked": "Sine.easeInOut",
    "dewHop": "Sine.easeInOut",
    "dewTeleport": "Cubic.easeIn",
    "dewClearHop": "Quad.easeOut",
    "dewGardenHop": "Sine.easeInOut",
    "dewGardenLand": "Quad.easeOut",
    "hatFollow": "Back.easeOut",
    "skinApply": "Sine.easeInOut",
    "cellSlide": "Linear",
    "slideMin": "Sine.easeInOut",
    "bloomStep": "Back.easeOut",
    "bloomPop": "Back.easeOut",
    "squash": "Sine.easeInOut",
    "rockBump": "Quad.easeOut",
    "treeBump": "Sine.easeInOut",
    "dirtWet": "Linear",
    "dirtCrumble": "Quad.easeIn",
    "iceCrack": "Quad.easeOut",
    "iceBreak": "Quad.easeIn",
    "puddleRipple": "Sine.easeOut",
    "petalPortal": "Back.easeOut",
    "petalSpin": "Linear",
    "leafTurn": "Sine.easeInOut",
    "mushroomBounce": "Back.easeOut",
    "potStop": "Back.easeOut",
    "acornSquash": "Quad.easeOut",
    "frogHop": "Sine.easeInOut",
    "frogLand": "Quad.easeOut",
    "undo": "Cubic.easeInOut",
    "shake": "Sine.easeInOut",
    "chainPop": "Back.easeOut",
    "banner": "Back.easeOut",
    "branchBanner": "Back.easeOut",
    "starStep": "Back.easeOut",
    "starLostFade": "Sine.easeOut",
    "perfectBadge": "Back.easeOut",
    "clearToResult": "Sine.easeInOut",
    "resultNewBestAt": "Linear",
    "resultCoinAt": "Linear",
    "resultUnlockAt": "Linear",
    "passBarFill": "Cubic.easeOut",
    "passLevelPop": "Back.easeOut",
    "coinPop": "Back.easeOut",
    "coinCount": "Quad.easeOut",
    "buyFly": "Cubic.easeInOut",
    "buyCountPop": "Back.easeOut",
    "badgePop": "Back.easeOut",
    "guideFadeIn": "Sine.easeOut",
    "guideFadeOut": "Sine.easeIn",
    "guidePulse": "Sine.easeInOut",
    "swipeGuide": "Sine.easeInOut",
    "tooltip": "Sine.easeOut",
    "hintDisplay": "Linear",
    "hintDraw": "Cubic.easeOut",
    "hintRing": "Sine.easeInOut",
    "hintPulse": "Sine.easeInOut",
    "hintDash": "Linear",
    "hintRewindStep": "Cubic.easeInOut",
    "hintGhost": "Sine.easeOut",
    "hintRewoundNotice": "Linear",
    "interactMark": "Sine.easeOut",
    "cardDelay": "Linear",
    "cardSlideIn": "Cubic.easeOut",
    "cardSlideOut": "Cubic.easeIn",
    "cardMax": "Linear",
    "cardDemo": "Cubic.easeInOut",
    "cardDemoGap": "Linear",
    "passBoxIdle": "Sine.easeInOut",
    "passBoxShake": "Sine.easeInOut",
    "passRewardFly": "Cubic.easeInOut",
    "unlockLock": "Back.easeIn",
    "crownSparkle": "Sine.easeOut",
    "gardenPick": "Quad.easeOut",
    "gardenPlace": "Back.easeOut",
    "gardenFailReturn": "Cubic.easeOut",
    "gardenZoom": "Sine.easeInOut",
    "plotExpand": "Back.easeOut",
    "residentTap": "Quad.easeOut",
    "buildDuration": "Linear",
    "buildShakePeriod": "Sine.easeInOut",
    "buildDustEvery": "Linear",
    "buildDustLife": "Quad.easeOut",
    "buildFade": "Sine.easeInOut",
    "buildHopUp": "Quad.easeOut",
    "buildHopDown": "Bounce.easeOut",
    "buildSparkleLife": "Quad.easeOut",
    "buildTapPop": "Quad.easeOut",
    "buildToast": "Linear",
    "skyFade": "Sine.easeInOut",
    "buildingFade": "Sine.easeInOut",
    "buildingFadeStagger": "Linear",
    "nightHintDelay": "Linear",
    "nightHint": "Linear",
    "lampFlicker": "Sine.easeInOut",
    "cloudDrift": "Linear",
    "smokeLife": "Quad.easeOut",
    "bladeSpin": "Linear",
    "wheelSpin": "Linear",
    "vaneSwing": "Sine.easeInOut",
    "flagSway": "Sine.easeInOut",
    "decorSway": "Sine.easeInOut",
    "bgMid": "Sine.easeInOut",
    "bgFront": "Sine.easeInOut",
    "press": "Quad.easeOut",
    "slide": "Sine.easeInOut",
    "pop": "Back.easeOut",
    "windowFlickerMin": "Sine.easeInOut",
    "windowFlickerMax": "Sine.easeInOut",
    "starTwinkleMin": "Sine.easeInOut",
    "starTwinkleMax": "Sine.easeInOut",
    "gardenReturnFade": "Sine.easeInOut",
    "buildShakeStop": "Sine.easeOut",
    "buildOverlayIn": "Sine.easeInOut",
    "hintBulbGlow": "Sine.easeInOut"
  },
  "depth": {
    "bg": 0,
    "mid": 10,
    "objects": 20,
    "hud": 30,
    "popup": 40,
    "gardenBase": 100,
    "gardenUi": 300
  },
  "motionNotes": {
    "legacyEasingKeys": "press, slide, pop alias buttonPress, slideMin, panelPop (game/src still reads THEME.easing.slide)",
    "screenFade": "camera fadeOut 125ms + fadeIn 125ms = 250ms Sine.easeInOut on every transition; S3 -> S4 waits clearToResult 1200 first",
    "buttons": "ui-kit kitStates for every kit control: hover scale 1.03 over buttonHover with an instant face swap to @pastelHi / @hi; pressed .94 over buttonPress; release to 1 (or 1.03 if still hovered) over buttonRelease Back.easeOut; disabled = grey face, label alpha .5, no pressed scale, tap = nudge",
    "nudge": "x +-6px, 2 cycles in 240ms: F4 blocked (dew), F14 undo empty, F22 hint 0, F24 buy disabled",
    "pulse": "outline alpha .35 <-> 1, yoyo, 1000ms per way (2s period): hint 1-4 tip, Decorate coach, pass claim buttons, result pass button (R22 one blink = 1 cycle); badgePulse scale 1 <-> 1.08 1000ms per way",
    "dew": "plan 3-8 / F44: breathe 1.0<->1.04, dewBreath 800ms each way yoyo = 1.6s period; blink scaleY 1 -> .1 -> 1 120ms every 2.5-5s; slide stretch 1.18 x .88 in 60ms, turn press .94 -> 1 80ms on the body swap frame; stop squash .88 x 1.12 120ms then 100ms Back; face container scale = 1 + (body scale - 1) * .5. The face is inside bodyRig (theme.dew.rig), so it follows the body position every frame during stretch, squash, breathe and turn; no one-off placement",
    "bloom": "flower_0 -> 1 (0ms) -> 2 (100ms) -> 3 (200ms) texture swaps, each step scale 1.1 -> 1 100ms, last step pop 1 -> 1.2 -> 1 200ms + 6 petals; undo reverses within 150ms",
    "hint": "R18/F27: rewind one move per 150ms (max 1200ms), wrong landing ghost alpha .35 fades over 300ms; F21: path draws over 220ms, ring from +220ms, overlay 4000ms then guideFadeOut; dew gazes the direction; F26 notice fades in 150ms, stays 2500ms",
    "card": "R22: element card 2000ms after the F18 banner; discovery cards right after the F45 mark (600ms) and they do not close on move; timer bar 6000ms linear",
    "result": "stars 0-900 (starStep x3), perfect badge at 900 (perfectBadge), NEW at 900 (badgePop), coins +N and count at 1100, pass bar fills over passBarFill from 1100, pass level ribbon pops when the bar reaches the level, unlock banner at 1700. Tap = jump to end state",
    "pass": "claimable box scale 1 <-> 1.06 1000ms; claim: x +-4px x2 in 200ms -> reward_open -> reward icon scale 1 -> 1.25 then flies to the coin pill / tray 500ms Cubic.easeInOut (total 700ms)",
    "garden": "F36 pick: item lifts 8px over 120ms, shadow grows; F37 place: squash .9 -> 1 150ms Back + 4 leaf bits; F38 fail: red outline blinks 2x then returns 200ms Cubic.easeOut; F39 zoom 1.0 <-> 0.6 250ms; F41 plot expand: new tiles rise 12px -> 0 from the edge, 600ms Back, 40ms stagger",
    "build": "R44 timeline from the drop (t = 0). Completion = 3000ms after the drop (plan cond); the crossfade is inside the 3000ms, only the hop follows it. One Container per building holds both state Images, its overlays and its window halos; angle / y / scale tweens run on the Container only and children tween alpha only, so the two stacked images can never drift apart. 0: _build alpha 1, shake angle 0 -> +1.5 -> -1.5 (80ms each way, 160ms period, Sine.easeInOut, repeat), dust every 150ms, tock every 400ms. 2640: end the repeat on a whole cycle and tween angle -> 0 over buildShakeStop 60ms; stop dust and tock. 2700-3000: crossfade _build 1 -> 0 and the period image (_day with the period tint, or _night) 0 -> 1 over buildFade 300ms; overlays and, at night, the window halos of that building fade 0 -> 1 over the same 300ms (buildOverlayIn). 3000: hop the Container -12px over buildHopUp 160 Quad.easeOut, back over buildHopDown 190 Bounce.easeOut; 8 sparkles burst at 3000 from the roof (life 500); constructDone at 3000; idle motions (smoke, blades, flags, flicker) start at 3350. F51 night hint at 3750 (400ms after the hop), 2500ms. F48 tap pop 1 -> 1.03 -> 1 over 100ms also runs on the Container",
    "period": "R45: poll 1000ms. On a period change: sky gradient, sun/moon position + alpha, cloud tint, plot/floor/decor tint and lamp alpha tween over skyFade 3000 Sine.easeInOut. Buildings: tint changes on the same _day image (dawn #FFE4D0 -> day #FFFFFF -> dusk #FFC89A, and the overlay night tint #8C96D0 <-> period tint) tween over buildingFade 1500 with the per-building stagger 100ms (max 600, nearest the camera centre first). _day <-> _night swaps (same silhouette): the incoming image is drawn on top and fades 0 -> 1 over buildingFade 1500 with the same stagger, the outgoing image stays at alpha 1 underneath (keeping its current tint) and is hidden when the fade ends; the incoming _night has only nightBase (no period tint). Window halo alpha = nightVisibility x glowAlpha x flicker, where nightVisibility = incoming _night alpha on day -> night and 1 - incoming _day alpha on night -> day (1 while _night is the only visible layer, 0 while _day is), so halos follow each building fade and stagger. Night stars fade in over skyFade 3000: 8 stars from 18:00 (late dusk), the other 16 at 19:00; all fade out over 3000 at 05:00. Tab return (visibilitychange back): every period value jumps to the current period over gardenReturnFade 300 Sine.easeInOut. Garden entry and save restore: instant",
    "windowFlicker": "per window halo: random start phase; each cycle picks a period between windowFlickerMin 1200 and windowFlickerMax 3200 (half each way, Sine.easeInOut) and a target alpha 1.0, or 0.5 with 17% probability (plan windowDimChancePct), around a base of 0.75. Rendered alpha = flicker x glowAlpha .38 (0.29 - 0.38, dip 0.19). Halos count toward the R46 building animation cap; beyond the cap they hold 0.75 without flicker",
    "starTwinkle": "per star: random start phase, period between starTwinkleMin 1500 and starTwinkleMax 3000, alpha .4 <-> 1, Sine.easeInOut",
    "lampFlicker": "lamp glow alpha base (dawn .2, dusk .25, night .5) + 0.1 over lampFlicker 1000ms each way (2s period), random phase per lamp",
    "hintBulbGlow": "hint_bulb glow alpha .6 <-> 1, hintBulbGlow 800ms each way yoyo (1.6s period, plan 3-12-1), only while hints >= 1; off and bulb tint #888888 at 0"
  }
};
export default THEME;
