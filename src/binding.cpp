#include "../include/tesseract/baseapi.h"
#include <leptonica/allheaders.h>
#include <napi.h>

Napi::Object AnalyzeImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Wrong number of arguments")
            .ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    std::string inputFile = info[0].As<Napi::String>().Utf8Value();
    
    tesseract::TessBaseAPI *api = new tesseract::TessBaseAPI();
    Napi::Object result = Napi::Object::New(env);
    
    if (api->Init(NULL, "eng")) {
        Napi::Error::New(env, "Could not initialize tesseract.")
            .ThrowAsJavaScriptException();
        return result;
    }

    Pix *pix = pixRead(inputFile.c_str());
    if (!pix) {
        api->End();
        Napi::Error::New(env, "Cannot process input file")
            .ThrowAsJavaScriptException();
        return result;
    }

    api->SetPageSegMode(tesseract::PSM_AUTO_OSD);
    api->SetImage(pix);
    api->Recognize(0);

    Napi::Array words = Napi::Array::New(env);
    int wordCount = 0;

    tesseract::ResultIterator* ri = api->GetIterator();
    if (ri != 0) {
        do {
            const char* word = ri->GetUTF8Text(tesseract::RIL_WORD);
            if (word != 0) {
                const char *font_name;
                bool bold, italic, underlined, monospace, serif, smallcaps;
                int pointsize, font_id;
                
                font_name = ri->WordFontAttributes(&bold, &italic, &underlined,
                                               &monospace, &serif,
                                               &smallcaps, &pointsize,
                                               &font_id);

                Napi::Object wordInfo = Napi::Object::New(env);
                wordInfo.Set("text", word);
                wordInfo.Set("fontName", font_name);
                wordInfo.Set("fontSize", pointsize);
                wordInfo.Set("fontId", font_id);
                wordInfo.Set("bold", bold);
                wordInfo.Set("italic", italic);
                wordInfo.Set("underlined", underlined);
                wordInfo.Set("monospace", monospace);
                wordInfo.Set("serif", serif);
                wordInfo.Set("smallcaps", smallcaps);

                words.Set(wordCount++, wordInfo);
                delete[] word;
            }
        } while (ri->Next(tesseract::RIL_WORD));
    }

    result.Set("words", words);

    delete ri;
    api->End();
    pixDestroy(&pix);
    
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("analyzeImage", Napi::Function::New(env, AnalyzeImage));
    return exports;
}

NODE_API_MODULE(tesseract, Init) 