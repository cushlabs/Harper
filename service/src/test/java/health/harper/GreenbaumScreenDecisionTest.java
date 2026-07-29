package health.harper;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

/**
 * Unit tests for the Greenbaum screen DMN decision (endpoint POST /GreenbaumScreen).
 *
 * Positive when >= 2 of the six items are positive (the partner item counts when > 5).
 *
 * The significant-trauma item is answered by two subquestions: 1a broken bones / cuts
 * needing stitches, and 1b knocked unconscious. Under the ORIGINAL screen a yes to
 * either counts once. Under the MODIFIED tool 1a is dropped and only 1b scores, which
 * the multi-site evaluation found raises ED specificity from ~49.4% to ~59.5% with no
 * loss of sensitivity. Harper defaults to modified; screenVariant selects.
 */
@QuarkusTest
class GreenbaumScreenDecisionTest {

    private static final String CT = "application/json";
    private static final String DECISION = "atRisk";

    /** All six items negative, partners 0, unless overridden. */
    private static String body(String... overrides) {
        StringBuilder sb = new StringBuilder("{")
            .append("\"historyOfBrokenBonesOrCuts\": false,")
            .append("\"historyOfKnockedUnconscious\": false,")
            .append("\"historyOfRunningAway\": false,")
            .append("\"historyOfAlcoholOrDrugAbuse\": false,")
            .append("\"everInvolvedWithLawEnforcement\": false,")
            .append("\"historyOfSTD\": false,")
            .append("\"numberOfSexualPartners\": 0");
        for (String o : overrides) sb.append(",").append(o);
        return sb.append("}").toString();
    }

    private static void assertAtRisk(String json, boolean expected) {
        given().contentType(CT).body(json)
            .when().post("/GreenbaumScreen")
            .then().statusCode(200)
            .body(DECISION, is(expected));
    }

    // ---- cutoff behaviour ---------------------------------------------------

    @Test
    void twoOrMorePositive_isAtRisk() {
        assertAtRisk(body("\"historyOfKnockedUnconscious\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true"), true);
    }

    @Test
    void singlePositive_isNotAtRisk() {
        assertAtRisk(body("\"historyOfKnockedUnconscious\": true"), false);
    }

    @Test
    void nonePositive_isNotAtRisk() {
        assertAtRisk(body(), false);
    }

    // ---- partner item -------------------------------------------------------

    @Test
    void moreThanFivePartnersPlusOneItem_isAtRisk() {
        assertAtRisk(body("\"historyOfKnockedUnconscious\": true",
                          "\"numberOfSexualPartners\": 6"), true);
    }

    @Test
    void exactlyFivePartners_doesNotCount() {
        assertAtRisk(body("\"historyOfKnockedUnconscious\": true",
                          "\"numberOfSexualPartners\": 5"), false);
    }

    // ---- variant: the 1a subquestion ---------------------------------------

    /** Modified tool (the default): 1a is ignored, so 1a + one other item stays below cutoff. */
    @Test
    void modifiedVariant_brokenBonesDoesNotScore() {
        assertAtRisk(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true"), false);
    }

    /** Same answers under the original screen: 1a scores, so the cutoff is met. */
    @Test
    void originalVariant_brokenBonesScores() {
        assertAtRisk(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true",
                          "\"screenVariant\": \"original\""), true);
    }

    /** Under the original screen 1a and 1b together still count once, not twice. */
    @Test
    void originalVariant_bothSubquestionsCountOnce() {
        assertAtRisk(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfKnockedUnconscious\": true",
                          "\"screenVariant\": \"original\""), false);
    }

    /** 1b scores under both variants. */
    @Test
    void modifiedVariant_knockedUnconsciousStillScores() {
        assertAtRisk(body("\"historyOfKnockedUnconscious\": true",
                          "\"historyOfRunningAway\": true"), true);
    }

    // ---- defaulting and partial input --------------------------------------

    /** Omitting screenVariant is treated as modified. */
    @Test
    void omittedVariant_defaultsToModified() {
        assertAtRisk("{\"historyOfBrokenBonesOrCuts\": true,"
                   + "\"historyOfAlcoholOrDrugAbuse\": true}", false);
    }

    /** An unrecognised variant falls back to modified rather than erroring. */
    @Test
    void unrecognisedVariant_defaultsToModified() {
        assertAtRisk(body("\"historyOfBrokenBonesOrCuts\": true",
                          "\"historyOfAlcoholOrDrugAbuse\": true",
                          "\"screenVariant\": \"nonsense\""), false);
    }

    /** Unanswered items are absent rather than false; scoring must not blow up. */
    @Test
    void partiallyAnsweredScreen_scoresAnsweredItemsOnly() {
        assertAtRisk("{\"historyOfKnockedUnconscious\": true,"
                   + "\"historyOfRunningAway\": true}", true);
    }
}
