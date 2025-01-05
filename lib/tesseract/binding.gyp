{
  "targets": [{
    "target_name": "tesseract_native",
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions" ],
    "sources": [ "src/binding.cpp" ],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")",
      "../../../include",
      "/opt/homebrew/Cellar/tesseract/5.5.0/include",
      "/opt/homebrew/Cellar/leptonica/1.85.0/include",
      "/opt/homebrew/include"
    ],
    "libraries": [
      "-L/opt/homebrew/Cellar/tesseract/5.5.0/lib",
      "-L/opt/homebrew/Cellar/leptonica/1.85.0/lib",
      "-L/opt/homebrew/lib",
      "-ltesseract",
      "-lleptonica"
    ],
    "xcode_settings": {
      "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
      "CLANG_CXX_LIBRARY": "libc++",
      "MACOSX_DEPLOYMENT_TARGET": "10.15"
    },
    'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
  }]
}