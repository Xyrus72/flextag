const express = require('express')
const router = express.Router()

const { GoogleGenAI } = require('@google/genai')

const { requireAuth, requireRole } = require('../middleware/auth')

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})


// ─────────────────────────────────────────────────────────────
// POST /api/ai/caption
// Generate a social media caption
// ─────────────────────────────────────────────────────────────

router.post(
  '/caption',
  requireAuth,
  requireRole('creator'),
  async (req, res) => {

    try {

      const {
        product,
        brand,
        language,
        platform
      } = req.body


      // Basic validation
      if (!product) {
        return res.status(400).json({
          message: 'Product is required.'
        })
      }


      const selectedLanguage =
        language || 'english'

      const selectedPlatform =
        platform || 'instagram'


      // Language instruction
      let languageInstruction = ''

      if (selectedLanguage === 'bangla') {

        languageInstruction =
          'Write the caption naturally in Bangla.'

      } else if (selectedLanguage === 'banglish') {

        languageInstruction =
          'Write the caption in natural Banglish using English letters mixed with Bangla expressions.'

      } else {

        languageInstruction =
          'Write the caption naturally in English.'

      }


      // AI prompt
      const prompt = `
You are the social media creative assistant for Flextag,
a creator marketing platform in Bangladesh.

Create an engaging social media caption for a creator
who received a product through a Flextag campaign.

Product: ${product}
Brand: ${brand || 'the partner brand'}
Platform: ${selectedPlatform}

Requirements:

- ${languageInstruction}
- Make it sound natural and human.
- Do not make unrealistic claims.
- Do not say that the product is sponsored unless appropriate.
- Keep it suitable for social media.
- Make it engaging but not overly promotional.
- Include 4 to 6 relevant hashtags.
- Do not use quotation marks around the caption.
- Keep the caption reasonably short.

Return only the final caption.
`


      // Gemini API call
      const response =
        await ai.models.generateContent({

          model: 'gemini-3.6-flash',

          contents: prompt

        })


      const caption =
        response.text?.trim()


      if (!caption) {

        return res.status(500).json({
          message:
            'AI did not return a caption.'
        })

      }


      res.json({
        caption
      })


    } catch (err) {

      console.error(
        '[AI caption error]',
        err
      )

      res.status(500).json({
        message:
          'Failed to generate AI caption.'
      })

    }

  }
)


module.exports = router